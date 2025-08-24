const crypto = require('crypto');
const { ethers } = require('ethers');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool();

// Contract ABI for CateCertificates
const CATE_CERT_ABI = [
  "function registerCertificate(bytes32 certHash, string memory metadata) external",
  "function verifyCertificate(bytes32 certHash) external view returns (bool isValid, address issuer, uint256 timestamp)",
  "function getCertificate(bytes32 certHash) external view returns (tuple(bytes32 hash, address issuer, uint256 timestamp, bool exists))",
  "function isAuthorizedIssuer(address issuer) external view returns (bool)",
  "function getStats() external view returns (uint256, uint256)",
  "event CertificateRegistered(bytes32 indexed certHash, address indexed issuer, uint256 timestamp, string metadata)"
];

class CertificateService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    this.contract = new ethers.Contract(
      process.env.CATE_CERT_CONTRACT_ADDRESS,
      CATE_CERT_ABI,
      this.provider
    );
  }

  /**
   * Generate SHA-256 hash from certificate data
   * @param {Object} certData - Certificate data object
   * @returns {string} - SHA-256 hash in hex format
   */
  generateCertificateHash(certData) {
    const certString = JSON.stringify(certData, Object.keys(certData).sort());
    return crypto.createHash('sha256').update(certString).digest('hex');
  }

  /**
   * Issue a new certificate
   * @param {Object} certData - Certificate data
   * @param {string} issuerWallet - Issuer's wallet address
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Certificate file data
   */
  async issueCertificate(certData, issuerWallet, metadata = {}) {
    try {
      // 1. Generate hash
      const certHash = this.generateCertificateHash(certData);
      
      // 2. Check if certificate already exists
      const existingCert = await this.getCertificateByHash(certHash);
      if (existingCert) {
        throw new Error('Certificate with this hash already exists');
      }

      // 3. Verify issuer is authorized
      const issuer = await this.getIssuerByWallet(issuerWallet);
      if (!issuer || issuer.status !== 'active') {
        throw new Error('Issuer not found or not authorized');
      }

      // 4. Register on blockchain
      const wallet = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY, this.provider);
      const contractWithSigner = this.contract.connect(wallet);
      
      const tx = await contractWithSigner.registerCertificate(
        `0x${certHash}`,
        JSON.stringify(metadata)
      );
      
      const receipt = await tx.wait();
      const blockNumber = receipt.blockNumber;

      // 5. Save to database
      const certId = await this.saveCertificateToDatabase(
        certHash,
        issuer.id,
        issuer.organization_id,
        tx.hash,
        blockNumber,
        certData,
        metadata
      );

      // 6. Create .catecert file data
      const certificateFile = {
        version: "1.0",
        data: certData,
        signature: certHash,
        issuer: {
          id: issuer.id,
          name: issuer.name,
          wallet: issuerWallet,
          organization: issuer.organization_id
        },
        blockchain: {
          network: "Polygon",
          txHash: tx.hash,
          blockNumber: blockNumber,
          contractAddress: process.env.CATE_CERT_CONTRACT_ADDRESS
        },
        metadata: metadata,
        issuedAt: new Date().toISOString()
      };

      return {
        certificateId: certId,
        certificateFile,
        txHash: tx.hash,
        blockNumber: blockNumber
      };

    } catch (error) {
      console.error('Error issuing certificate:', error);
      throw error;
    }
  }

  /**
   * Verify a certificate
   * @param {Object} certificateFile - .catecert file data
   * @param {string} clientIp - Client IP for logging
   * @returns {Object} - Verification result
   */
  async verifyCertificate(certificateFile, clientIp = null) {
    try {
      const { signature, data, issuer } = certificateFile;

      // 1. Verify hash matches data
      const calculatedHash = this.generateCertificateHash(data);
      if (calculatedHash !== signature) {
        await this.logVerification(null, 'invalid', { 
          reason: 'Hash mismatch',
          providedHash: signature,
          calculatedHash: calculatedHash
        }, clientIp);
        
        return {
          isValid: false,
          status: 'invalid',
          message: 'Certificate data has been altered',
          details: {
            providedHash: signature,
            calculatedHash: calculatedHash
          }
        };
      }

      // 2. Check blockchain verification
      const blockchainResult = await this.verifyOnBlockchain(signature);
      
      if (!blockchainResult.isValid) {
        await this.logVerification(null, 'invalid', {
          reason: 'Blockchain verification failed',
          blockchainResult
        }, clientIp);
        
        return {
          isValid: false,
          status: 'invalid',
          message: 'Certificate not found on blockchain',
          details: blockchainResult
        };
      }

      // 3. Check database verification
      const dbResult = await this.verifyInDatabase(signature);
      
      if (!dbResult.isValid) {
        await this.logVerification(dbResult.certificateId, dbResult.status, {
          reason: 'Database verification failed',
          dbResult
        }, clientIp);
        
        return {
          isValid: false,
          status: dbResult.status,
          message: dbResult.message,
          details: dbResult
        };
      }

      // 4. Log successful verification
      await this.logVerification(dbResult.certificateId, 'valid', {
        blockchainIssuer: blockchainResult.issuer,
        dbIssuer: dbResult.issuer
      }, clientIp);

      return {
        isValid: true,
        status: 'valid',
        message: 'Certificate is valid',
        certificate: dbResult.certificate,
        blockchain: blockchainResult,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error verifying certificate:', error);
      await this.logVerification(null, 'error', {
        reason: 'Verification error',
        error: error.message
      }, clientIp);
      
      throw error;
    }
  }

  /**
   * Verify certificate on blockchain
   * @param {string} certHash - Certificate hash
   * @returns {Object} - Blockchain verification result
   */
  async verifyOnBlockchain(certHash) {
    try {
      const [isValid, issuer, timestamp] = await this.contract.verifyCertificate(`0x${certHash}`);
      
      return {
        isValid,
        issuer: issuer,
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
        network: 'Polygon'
      };
    } catch (error) {
      console.error('Blockchain verification error:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify certificate in database
   * @param {string} certHash - Certificate hash
   * @returns {Object} - Database verification result
   */
  async verifyInDatabase(certHash) {
    try {
      const result = await pool.query(
        'SELECT * FROM verify_certificate_integrity($1)',
        [certHash]
      );

      if (result.rows.length === 0) {
        return {
          isValid: false,
          status: 'invalid',
          message: 'Certificate not found in database'
        };
      }

      const verification = result.rows[0];
      
      if (!verification.is_valid) {
        return {
          isValid: false,
          status: verification.cert_status || 'invalid',
          message: verification.verification_message
        };
      }

      // Get full certificate details
      const certResult = await pool.query(
        'SELECT * FROM get_certificate_with_issuer($1)',
        [certHash]
      );

      return {
        isValid: true,
        status: 'valid',
        message: 'Certificate verified in database',
        certificate: certResult.rows[0] || null
      };

    } catch (error) {
      console.error('Database verification error:', error);
      return {
        isValid: false,
        status: 'error',
        message: 'Database verification error',
        error: error.message
      };
    }
  }

  /**
   * Save certificate to database
   * @param {string} hash - Certificate hash
   * @param {number} issuerId - Issuer ID
   * @param {number} organizationId - Organization ID
   * @param {string} txHash - Transaction hash
   * @param {number} blockNumber - Block number
   * @param {Object} certData - Certificate data
   * @param {Object} metadata - Metadata
   * @returns {number} - Certificate ID
   */
  async saveCertificateToDatabase(hash, issuerId, organizationId, txHash, blockNumber, certData, metadata) {
    const result = await pool.query(
      `INSERT INTO certificates (hash, issuer_id, organization_id, tx_hash, block_number, cert_data, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [hash, issuerId, organizationId, txHash, blockNumber, certData, metadata]
    );
    
    return result.rows[0].id;
  }

  /**
   * Get certificate by hash
   * @param {string} hash - Certificate hash
   * @returns {Object|null} - Certificate data
   */
  async getCertificateByHash(hash) {
    const result = await pool.query(
      'SELECT * FROM get_certificate_with_issuer($1)',
      [hash]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get issuer by wallet address
   * @param {string} walletAddress - Wallet address
   * @returns {Object|null} - Issuer data
   */
  async getIssuerByWallet(walletAddress) {
    const result = await pool.query(
      'SELECT * FROM issuers WHERE wallet_address = $1',
      [walletAddress]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Log verification attempt
   * @param {number} certificateId - Certificate ID
   * @param {string} result - Verification result
   * @param {Object} details - Verification details
   * @param {string} clientIp - Client IP
   */
  async logVerification(certificateId, result, details, clientIp) {
    try {
      await pool.query(
        `INSERT INTO certificate_verifications (certificate_id, verifier_ip, verification_result, verification_details)
         VALUES ($1, $2, $3, $4)`,
        [certificateId, clientIp, result, details]
      );
    } catch (error) {
      console.error('Error logging verification:', error);
    }
  }

  /**
   * Get certificates by organization
   * @param {number} organizationId - Organization ID
   * @returns {Array} - Array of certificates
   */
  async getCertificatesByOrganization(organizationId) {
    const result = await pool.query(
      'SELECT * FROM get_certificates_by_organization($1)',
      [organizationId]
    );
    
    return result.rows;
  }

  /**
   * Get issuer statistics
   * @param {string} walletAddress - Issuer wallet address
   * @returns {Object} - Issuer statistics
   */
  async getIssuerStats(walletAddress) {
    const result = await pool.query(
      'SELECT * FROM get_issuer_stats($1)',
      [walletAddress]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Create .catecert file
   * @param {Object} certificateFile - Certificate file data
   * @returns {Buffer} - File buffer
   */
  createCertificateFile(certificateFile) {
    const fileContent = JSON.stringify(certificateFile, null, 2);
    return Buffer.from(fileContent, 'utf8');
  }

  /**
   * Parse .catecert file
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Object} - Parsed certificate file
   */
  parseCertificateFile(fileBuffer) {
    try {
      const fileContent = fileBuffer.toString('utf8');
      const certificateFile = JSON.parse(fileContent);
      
      // Validate required fields
      if (!certificateFile.signature || !certificateFile.data) {
        throw new Error('Invalid certificate file format');
      }
      
      return certificateFile;
    } catch (error) {
      throw new Error('Failed to parse certificate file: ' + error.message);
    }
  }

  /**
   * Get contract statistics
   * @returns {Object} - Contract statistics
   */
  async getContractStats() {
    try {
      const [totalCertificates, totalIssuers] = await this.contract.getStats();
      
      return {
        totalCertificates: totalCertificates.toString(),
        totalIssuers: totalIssuers.toString(),
        network: 'Polygon',
        contractAddress: process.env.CATE_CERT_CONTRACT_ADDRESS
      };
    } catch (error) {
      console.error('Error getting contract stats:', error);
      return {
        error: error.message
      };
    }
  }
}

module.exports = new CertificateService();
