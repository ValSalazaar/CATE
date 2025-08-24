// api/kyc.routes.js
import express from "express";
import bodyParser from "body-parser";
import { q } from "../db/index.js";
import { kyc } from "../kyc/index.js";
import { issueUserVC } from "../services/vc.service.js";

const router = express.Router();

// Iniciar sesión KYC
router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const { rows: users } = await q("SELECT * FROM app_user WHERE id=$1", [userId]);
    if (!users.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = users[0];
    const session = await kyc.start({ userId: user.id, email: user.email });

    const { rows } = await q(
      `INSERT INTO kyc_session (user_id, provider, provider_session_id, status)
       VALUES ($1,$2,$3,'pending') RETURNING *`,
      [user.id, process.env.KYC_PROVIDER || "mock", session.provider_session_id]
    );

    res.json({ 
      success: true,
      session: rows[0], 
      flowUrl: session.url,
      expiresAt: session.expires_at
    });
  } catch (err) {
    console.error('Error starting KYC session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener estado de sesión KYC
router.get("/session/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    const { rows } = await q(
      `SELECT ks.*, u.email, u.eth_address
       FROM kyc_session ks
       JOIN app_user u ON ks.user_id = u.id
       WHERE ks.provider_session_id = $1`,
      [sessionId]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }
    
    res.json({ session: rows[0] });
  } catch (err) {
    console.error('Error getting KYC session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener sesiones KYC de un usuario
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const { rows } = await q(
      `SELECT * FROM kyc_session 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ sessions: rows });
  } catch (err) {
    console.error('Error getting user KYC sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook KYC (usa raw body para verificar firma)
router.post(
  "/webhook",
  bodyParser.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      const signature = req.header("X-KYC-Signature") || "";
      const rawBody = req.body.toString("utf8");
      
      if (!kyc.verifySignature(rawBody, signature)) {
        console.error('Invalid webhook signature');
        return res.status(401).send("Invalid signature");
      }

      const payload = JSON.parse(rawBody);
      // Payload esperado (mock): { provider_session_id, status: 'approved'|'rejected', result: {...} }
      const { provider_session_id, status, result } = payload;

      const { rows: sessions } = await q(
        "SELECT * FROM kyc_session WHERE provider_session_id=$1",
        [provider_session_id]
      );
      
      if (!sessions.length) {
        console.error('KYC session not found:', provider_session_id);
        return res.status(404).send("session not found");
      }

      const session = sessions[0];
      await q(
        "UPDATE kyc_session SET status=$1, result_json=$2, updated_at=now() WHERE id=$3",
        [status, result || {}, session.id]
      );

      if (status === "approved") {
        // Emitir VC automáticamente
        const { rows: users } = await q("SELECT * FROM app_user WHERE id=$1", [session.user_id]);
        const user = users[0];
        const schema = "cate/v1/identity";
        const claims = {
          kycLevel: "basic",
          documentVerified: true,
          selfieMatch: true,
          livenessDetected: true,
          riskScore: result?.risk_score || 0.1,
          provider: process.env.KYC_PROVIDER || "mock",
          verificationDate: result?.verification_date || new Date().toISOString()
        };

        const issuance = await issueUserVC({
          user,
          kycSession: session,
          schema,
          claims
        });

        // Devolver 200 con referencia del VC
        return res.json({ 
          ok: true, 
          vc: issuance.credential, 
          txHash: issuance.txHash 
        });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('Error processing KYC webhook:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// Simular webhook para testing (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  router.post("/simulate-webhook", async (req, res) => {
    try {
      const { sessionId, status = 'approved' } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }
      
      // Verificar que la sesión existe
      const { rows: sessions } = await q(
        "SELECT * FROM kyc_session WHERE provider_session_id=$1",
        [sessionId]
      );
      
      if (!sessions.length) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Crear payload simulado
      const webhookData = kyc.createMockWebhookPayload(sessionId, status);
      
      // Simular el webhook
      const mockReq = {
        header: () => webhookData.signature,
        body: Buffer.from(webhookData.rawBody, 'utf8')
      };
      
      const mockRes = {
        status: (code) => ({
          send: (data) => ({ statusCode: code, data }),
          json: (data) => ({ statusCode: code, data })
        }),
        json: (data) => ({ statusCode: 200, data })
      };
      
      // Procesar el webhook
      const result = await processWebhook(mockReq, mockRes);
      
      res.json({
        success: true,
        webhookData,
        result
      });
    } catch (err) {
      console.error('Error simulating webhook:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// Función auxiliar para procesar webhook
async function processWebhook(req, res) {
  const signature = req.header("X-KYC-Signature") || "";
  const rawBody = req.body.toString("utf8");
  
  if (!kyc.verifySignature(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  const payload = JSON.parse(rawBody);
  const { provider_session_id, status, result } = payload;

  const { rows: sessions } = await q(
    "SELECT * FROM kyc_session WHERE provider_session_id=$1",
    [provider_session_id]
  );
  
  if (!sessions.length) {
    return res.status(404).send("session not found");
  }

  const session = sessions[0];
  await q(
    "UPDATE kyc_session SET status=$1, result_json=$2, updated_at=now() WHERE id=$3",
    [status, result || {}, session.id]
  );

  if (status === "approved") {
    const { rows: users } = await q("SELECT * FROM app_user WHERE id=$1", [session.user_id]);
    const user = users[0];
    const schema = "cate/v1/identity";
    const claims = {
      kycLevel: "basic",
      documentVerified: true,
      selfieMatch: true,
      livenessDetected: true,
      riskScore: result?.risk_score || 0.1,
      provider: process.env.KYC_PROVIDER || "mock",
      verificationDate: result?.verification_date || new Date().toISOString()
    };

    const issuance = await issueUserVC({
      user,
      kycSession: session,
      schema,
      claims
    });

    return res.json({ 
      ok: true, 
      vc: issuance.credential, 
      txHash: issuance.txHash 
    });
  }

  return res.json({ ok: true });
}

export default router;
