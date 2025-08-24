// api/vc.routes.js
import express from "express";
import { q } from "../db/index.js";
import { vcContract, issuerAddress } from "../blockchain/contract.js";
import { encryptJSON, keccak256Of } from "../utils/crypto.js";
import { 
  issueUserVC, 
  revokeUserVC, 
  getUserCredentials, 
  getCredentialByOnchainId,
  verifyCredentialIntegrity,
  getCredentialStats
} from "../services/vc.service.js";

const router = express.Router();

// Middleware placeholder para rol "issuer"
function requireIssuer(req, res, next) {
  // TODO: validar JWT y rol
  return next();
}

// Emitir VC (manual o interno)
router.post("/", requireIssuer, async (req, res) => {
  try {
    const { userId, schema, claims } = req.body;
    
    if (!userId || !schema || !claims) {
      return res.status(400).json({ error: "Missing required fields: userId, schema, claims" });
    }
    
    const { rows: users } = await q("SELECT * FROM app_user WHERE id=$1", [userId]);
    if (!users.length || !users[0].eth_address) {
      return res.status(400).json({ error: "Usuario inválido o sin dirección Ethereum" });
    }

    const user = users[0];
    const metadata = {
      schema,
      subject: { ethAddress: user.eth_address, userId: user.id },
      issuer: { ethAddress: issuerAddress },
      claims,
      issuedAt: new Date().toISOString()
    };
    
    const metadataHash = await keccak256Of(metadata);
    const ciphertext = encryptJSON(metadata);

    const tx = await vcContract.issueCredential(user.eth_address, metadataHash);
    const receipt = await tx.wait();
    const log = receipt.logs.find(l => l.fragment?.name === "CredentialIssued");
    const onchainId = log?.args?.id;

    const { rows } = await q(
      `INSERT INTO credential
        (user_id, subject_address, issuer_address, onchain_id, metadata_hash, metadata_ciphertext, schema, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
       RETURNING *`,
      [user.id, user.eth_address, issuerAddress, onchainId, metadataHash, ciphertext, schema]
    );

    res.json({ 
      success: true,
      txHash: receipt.transactionHash, 
      credential: rows[0],
      metadata: metadata
    });
  } catch (err) {
    console.error('Error issuing credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// Revocar VC
router.delete("/:onchainId", requireIssuer, async (req, res) => {
  try {
    const id = req.params.onchainId; // 0x...
    
    const result = await revokeUserVC(id);
    res.json(result);
  } catch (err) {
    console.error('Error revoking credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// Consultar VC
router.get("/:onchainId", async (req, res) => {
  try {
    const id = req.params.onchainId;
    const result = await getCredentialByOnchainId(id);
    res.json(result);
  } catch (err) {
    console.error('Error getting credential:', err);
    res.status(404).json({ error: err.message });
  }
});

// Verificar integridad de VC
router.get("/:onchainId/verify", async (req, res) => {
  try {
    const id = req.params.onchainId;
    const result = await verifyCredentialIntegrity(id);
    res.json(result);
  } catch (err) {
    console.error('Error verifying credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener credenciales de un usuario
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const credentials = await getUserCredentials(userId);
    res.json({ credentials });
  } catch (err) {
    console.error('Error getting user credentials:', err);
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas de credenciales
router.get("/stats/overview", async (req, res) => {
  try {
    const stats = await getCredentialStats();
    res.json(stats);
  } catch (err) {
    console.error('Error getting credential stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar todas las credenciales (con paginación)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { rows } = await q(
      `SELECT c.*, u.email as user_email, ks.provider as kyc_provider
       FROM credential c
       LEFT JOIN app_user u ON c.user_id = u.id
       LEFT JOIN kyc_session ks ON c.kyc_session_id = ks.id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const { rows: countResult } = await q("SELECT COUNT(*) FROM credential");
    const total = parseInt(countResult[0].count);
    
    res.json({
      credentials: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error listing credentials:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar credenciales por schema
router.get("/schema/:schema", async (req, res) => {
  try {
    const schema = req.params.schema;
    const { rows } = await q(
      `SELECT c.*, u.email as user_email
       FROM credential c
       LEFT JOIN app_user u ON c.user_id = u.id
       WHERE c.schema = $1
       ORDER BY c.created_at DESC`,
      [schema]
    );
    
    res.json({ credentials: rows });
  } catch (err) {
    console.error('Error searching credentials by schema:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar credenciales por dirección Ethereum
router.get("/address/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { rows } = await q(
      `SELECT c.*, u.email as user_email
       FROM credential c
       LEFT JOIN app_user u ON c.user_id = u.id
       WHERE LOWER(c.subject_address) = $1 OR LOWER(c.issuer_address) = $1
       ORDER BY c.created_at DESC`,
      [address]
    );
    
    res.json({ credentials: rows });
  } catch (err) {
    console.error('Error searching credentials by address:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
