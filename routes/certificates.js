const express = require('express');
const multer = require('multer');
const certificateService = require('../services/certificates');
const { authMiddlewareWithDB, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.catecert')) {
      cb(null, true);
    } else {
      cb(new Error('Only .catecert and JSON files are allowed'), false);
    }
  }
});

/**
 * @route POST /certificates/issue
 * @desc Issue a new certificate
 * @access Private (Issuer role required)
 */
router.post('/issue', authMiddlewareWithDB, requireRole('issuer'), async (req, res) => {
  try {
    const { certData, metadata } = req.body;
    
    if (!certData) {
      return res.status(400).json({ error: 'Certificate data is required' });
    }

    // Get issuer wallet from user's organization
    const issuerWallet = req.user.organization?.wallet_address;
    if (!issuerWallet) {
      return res.status(400).json({ error: 'Organization wallet not configured' });
    }

    // Issue certificate
    const result = await certificateService.issueCertificate(
      certData,
      issuerWallet,
      metadata || {}
    );

    // Create .catecert file
    const fileBuffer = certificateService.createCertificateFile(result.certificateFile);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${result.certificateId}.catecert"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send file and metadata
    res.json({
      success: true,
      certificateId: result.certificateId,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      downloadUrl: `/certificates/${result.certificateId}/download`,
      certificate: result.certificateFile
    });

  } catch (error) {
    console.error('Certificate issuance error:', error);
    res.status(500).json({ 
      error: 'Failed to issue certificate',
      details: error.message 
    });
  }
});

/**
 * @route POST /certificates/verify
 * @desc Verify a certificate from uploaded file
 * @access Public
 */
router.post('/verify', upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    // Parse certificate file
    const certificateFile = certificateService.parseCertificateFile(req.file.buffer);

    // Get client IP
    const clientIp = req.ip || req.connection.remoteAddress;

    // Verify certificate
    const verificationResult = await certificateService.verifyCertificate(certificateFile, clientIp);

    res.json({
      success: true,
      verification: verificationResult
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(400).json({ 
      error: 'Failed to verify certificate',
      details: error.message 
    });
  }
});

/**
 * @route POST /certificates/verify-json
 * @desc Verify a certificate from JSON data
 * @access Public
 */
router.post('/verify-json', async (req, res) => {
  try {
    const { certificateFile } = req.body;
    
    if (!certificateFile) {
      return res.status(400).json({ error: 'Certificate file data is required' });
    }

    // Get client IP
    const clientIp = req.ip || req.connection.remoteAddress;

    // Verify certificate
    const verificationResult = await certificateService.verifyCertificate(certificateFile, clientIp);

    res.json({
      success: true,
      verification: verificationResult
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(400).json({ 
      error: 'Failed to verify certificate',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/:id
 * @desc Get certificate details by ID
 * @access Private (Organization members)
 */
router.get('/:id', authMiddlewareWithDB, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    
    if (isNaN(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    // Get certificate from database
    const result = await pool.query(
      `SELECT c.*, i.name as issuer_name, i.wallet_address as issuer_wallet,
              o.name as organization_name
       FROM certificates c
       JOIN issuers i ON c.issuer_id = i.id
       LEFT JOIN organizations o ON c.organization_id = o.id
       WHERE c.id = $1`,
      [certificateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certificate = result.rows[0];

    // Check if user has access to this certificate
    if (req.user.organization_id && certificate.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied to this certificate' });
    }

    res.json({
      success: true,
      certificate: {
        id: certificate.id,
        hash: certificate.hash,
        issuer: {
          name: certificate.issuer_name,
          wallet: certificate.issuer_wallet
        },
        organization: certificate.organization_name,
        txHash: certificate.tx_hash,
        blockNumber: certificate.block_number,
        status: certificate.status,
        metadata: certificate.metadata,
        certData: certificate.cert_data,
        createdAt: certificate.created_at
      }
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ 
      error: 'Failed to get certificate',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/:id/download
 * @desc Download certificate file
 * @access Private (Organization members)
 */
router.get('/:id/download', authMiddlewareWithDB, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    
    if (isNaN(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    // Get certificate from database
    const result = await pool.query(
      `SELECT c.*, i.name as issuer_name, i.wallet_address as issuer_wallet,
              o.name as organization_name
       FROM certificates c
       JOIN issuers i ON c.issuer_id = i.id
       LEFT JOIN organizations o ON c.organization_id = o.id
       WHERE c.id = $1`,
      [certificateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certificate = result.rows[0];

    // Check if user has access to this certificate
    if (req.user.organization_id && certificate.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied to this certificate' });
    }

    // Create certificate file
    const certificateFile = {
      version: "1.0",
      data: certificate.cert_data,
      signature: certificate.hash,
      issuer: {
        name: certificate.issuer_name,
        wallet: certificate.issuer_wallet,
        organization: certificate.organization_name
      },
      blockchain: {
        network: "Polygon",
        txHash: certificate.tx_hash,
        blockNumber: certificate.block_number,
        contractAddress: process.env.CATE_CERT_CONTRACT_ADDRESS
      },
      metadata: certificate.metadata,
      issuedAt: certificate.created_at
    };

    const fileBuffer = certificateService.createCertificateFile(certificateFile);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.catecert"`);
    res.setHeader('Content-Length', fileBuffer.length);

    res.send(fileBuffer);

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ 
      error: 'Failed to download certificate',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/organization/:orgId
 * @desc Get certificates by organization
 * @access Private (Organization members)
 */
router.get('/organization/:orgId', authMiddlewareWithDB, requireRole('viewer'), async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user has access to this organization
    if (req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    const certificates = await certificateService.getCertificatesByOrganization(orgId);

    res.json({
      success: true,
      certificates: certificates.map(cert => ({
        id: cert.cert_id,
        hash: cert.cert_hash,
        issuer: {
          name: cert.issuer_name,
          wallet: cert.issuer_wallet
        },
        txHash: cert.tx_hash,
        status: cert.status,
        createdAt: cert.created_at
      }))
    });

  } catch (error) {
    console.error('Get organization certificates error:', error);
    res.status(500).json({ 
      error: 'Failed to get certificates',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/stats/contract
 * @desc Get contract statistics
 * @access Public
 */
router.get('/stats/contract', async (req, res) => {
  try {
    const stats = await certificateService.getContractStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get contract stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get contract statistics',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/stats/issuer/:wallet
 * @desc Get issuer statistics
 * @access Private (Organization members)
 */
router.get('/stats/issuer/:wallet', authMiddlewareWithDB, async (req, res) => {
  try {
    const { wallet } = req.params;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const stats = await certificateService.getIssuerStats(wallet);
    
    if (!stats) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get issuer stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get issuer statistics',
      details: error.message 
    });
  }
});

/**
 * @route GET /certificates/verify/:hash
 * @desc Verify certificate by hash
 * @access Public
 */
router.get('/verify/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || !/^[a-fA-F0-9]{64}$/.test(hash)) {
      return res.status(400).json({ error: 'Invalid certificate hash' });
    }

    // Get client IP
    const clientIp = req.ip || req.connection.remoteAddress;

    // Get certificate from database
    const certificate = await certificateService.getCertificateByHash(hash);
    
    if (!certificate) {
      await certificateService.logVerification(null, 'not_found', {
        reason: 'Certificate not found in database'
      }, clientIp);
      
      return res.status(404).json({ 
        error: 'Certificate not found',
        verification: {
          isValid: false,
          status: 'not_found',
          message: 'Certificate not found in database'
        }
      });
    }

    // Verify on blockchain
    const blockchainResult = await certificateService.verifyOnBlockchain(hash);
    
    // Verify in database
    const dbResult = await certificateService.verifyInDatabase(hash);

    const verificationResult = {
      isValid: blockchainResult.isValid && dbResult.isValid,
      status: dbResult.isValid ? 'valid' : dbResult.status,
      message: dbResult.isValid ? 'Certificate is valid' : dbResult.message,
      certificate: certificate,
      blockchain: blockchainResult,
      verifiedAt: new Date().toISOString()
    };

    // Log verification
    await certificateService.logVerification(
      certificate.cert_id,
      verificationResult.isValid ? 'valid' : 'invalid',
      verificationResult,
      clientIp
    );

    res.json({
      success: true,
      verification: verificationResult
    });

  } catch (error) {
    console.error('Verify certificate by hash error:', error);
    res.status(500).json({ 
      error: 'Failed to verify certificate',
      details: error.message 
    });
  }
});

module.exports = router;
