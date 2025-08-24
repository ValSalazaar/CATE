const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// Middleware de autenticación
const authMiddleware = require('../middleware/auth');

// Configuración blockchain
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABI del contrato VerifiableCredentials
const VC_ABI = [
  "function issueCredential(address _subject, string calldata _metadataURI) external returns (bytes32)",
  "function revokeCredential(bytes32 _id) external",
  "function verifyCredential(bytes32 _id) external view returns (address issuer, address subject, string memory metadataURI, bool revoked, uint256 issuedAt)",
  "function getCredential(bytes32 _id) external view returns (tuple(address issuer, address subject, string metadataURI, bool revoked, uint256 issuedAt))",
  "function isAuthorizedIssuer(address _issuer) external view returns (bool)",
  "function authorizeIssuer(address _issuer) external",
  "function revokeIssuer(address _issuer) external",
  "event CredentialIssued(bytes32 indexed id, address indexed issuer, address indexed subject)",
  "event CredentialRevoked(bytes32 indexed id, address indexed issuer)",
  "event IssuerAuthorized(address indexed issuer)",
  "event IssuerRevoked(address indexed issuer)"
];

const contract = new ethers.Contract(process.env.VC_CONTRACT_ADDRESS, VC_ABI, wallet);

/**
 * @route POST /api/vc
 * @desc Emitir una nueva credencial verificable
 * @access Private (solo emisores autorizados)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject, metadataURI } = req.body;
    const { orgId } = req.user;

    // Validaciones
    if (!subject || !metadataURI) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: subject, metadataURI' 
      });
    }

    // Verificar que el usuario es un emisor autorizado
    const isAuthorized = await contract.isAuthorizedIssuer(wallet.address);
    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'No tienes permisos para emitir credenciales' 
      });
    }

    // Emitir credencial en blockchain
    const tx = await contract.issueCredential(subject, metadataURI);
    const receipt = await tx.wait();

    // Extraer el ID de la credencial del evento
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'CredentialIssued';
      } catch {
        return false;
      }
    });

    let credentialId;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      credentialId = parsed.args.id;
    }

    // Guardar en base de datos (opcional)
    // await db.query('INSERT INTO credentials (id, issuer, subject, metadata_uri, org_id) VALUES ($1, $2, $3, $4, $5)', 
    //   [credentialId, wallet.address, subject, metadataURI, orgId]);

    res.json({
      success: true,
      credentialId: credentialId,
      txHash: receipt.transactionHash,
      issuer: wallet.address,
      subject: subject,
      issuedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error emitiendo credencial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route DELETE /api/vc/:id
 * @desc Revocar una credencial verificable
 * @access Private (solo el emisor original)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.user;

    // Verificar que la credencial existe y pertenece al emisor
    const credential = await contract.getCredential(id);
    
    if (credential.issuer !== wallet.address) {
      return res.status(403).json({ 
        error: 'Solo el emisor original puede revocar la credencial' 
      });
    }

    if (credential.revoked) {
      return res.status(400).json({ 
        error: 'La credencial ya está revocada' 
      });
    }

    // Revocar credencial en blockchain
    const tx = await contract.revokeCredential(id);
    await tx.wait();

    // Actualizar en base de datos (opcional)
    // await db.query('UPDATE credentials SET revoked = true WHERE id = $1', [id]);

    res.json({
      success: true,
      credentialId: id,
      revoked: true,
      revokedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error revocando credencial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/vc/:id
 * @desc Consultar una credencial verificable
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Consultar credencial en blockchain
    const credential = await contract.getCredential(id);

    res.json({
      credentialId: id,
      issuer: credential.issuer,
      subject: credential.subject,
      metadataURI: credential.metadataURI,
      revoked: credential.revoked,
      issuedAt: new Date(Number(credential.issuedAt) * 1000).toISOString(),
      status: credential.revoked ? 'revoked' : 'valid'
    });

  } catch (error) {
    console.error('Error consultando credencial:', error);
    
    if (error.message.includes('Credencial no existe')) {
      return res.status(404).json({ 
        error: 'Credencial no encontrada' 
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/vc/verify/:id
 * @desc Verificar una credencial verificable
 * @access Public
 */
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar credencial en blockchain
    const [issuer, subject, metadataURI, revoked, issuedAt] = await contract.verifyCredential(id);

    // Verificar que el emisor está autorizado
    const isAuthorized = await contract.isAuthorizedIssuer(issuer);

    res.json({
      credentialId: id,
      valid: !revoked && isAuthorized,
      issuer: issuer,
      subject: subject,
      metadataURI: metadataURI,
      revoked: revoked,
      issuerAuthorized: isAuthorized,
      issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
      verificationDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verificando credencial:', error);
    
    if (error.message.includes('Credencial no existe')) {
      return res.status(404).json({ 
        error: 'Credencial no encontrada',
        valid: false
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message,
      valid: false
    });
  }
});

/**
 * @route POST /api/vc/authorize-issuer
 * @desc Autorizar un nuevo emisor
 * @access Private (solo emisores autorizados)
 */
router.post('/authorize-issuer', authMiddleware, async (req, res) => {
  try {
    const { issuerAddress } = req.body;
    const { orgId } = req.user;

    if (!issuerAddress) {
      return res.status(400).json({ 
        error: 'Dirección del emisor requerida' 
      });
    }

    // Verificar que el usuario actual es un emisor autorizado
    const isAuthorized = await contract.isAuthorizedIssuer(wallet.address);
    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'No tienes permisos para autorizar emisores' 
      });
    }

    // Autorizar emisor en blockchain
    const tx = await contract.authorizeIssuer(issuerAddress);
    await tx.wait();

    res.json({
      success: true,
      issuerAddress: issuerAddress,
      authorizedBy: wallet.address,
      authorizedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error autorizando emisor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/vc/revoke-issuer
 * @desc Revocar autorización de un emisor
 * @access Private (solo emisores autorizados)
 */
router.post('/revoke-issuer', authMiddleware, async (req, res) => {
  try {
    const { issuerAddress } = req.body;
    const { orgId } = req.user;

    if (!issuerAddress) {
      return res.status(400).json({ 
        error: 'Dirección del emisor requerida' 
      });
    }

    // Verificar que el usuario actual es un emisor autorizado
    const isAuthorized = await contract.isAuthorizedIssuer(wallet.address);
    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'No tienes permisos para revocar emisores' 
      });
    }

    // Revocar emisor en blockchain
    const tx = await contract.revokeIssuer(issuerAddress);
    await tx.wait();

    res.json({
      success: true,
      issuerAddress: issuerAddress,
      revokedBy: wallet.address,
      revokedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error revocando emisor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/vc/issuer-status/:address
 * @desc Verificar si una dirección está autorizada como emisor
 * @access Public
 */
router.get('/issuer-status/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const isAuthorized = await contract.isAuthorizedIssuer(address);

    res.json({
      address: address,
      authorized: isAuthorized,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verificando estado del emisor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

module.exports = router;
