// kyc/providers/mock.js
import crypto from "crypto";
import { config } from "../../config/env.js";

export async function startSession({ userId, email }) {
  // Simula crear una sesión y devolver una URL del flujo
  const provider_session_id = "mock_" + crypto.randomBytes(8).toString("hex");
  const url = `https://kyc.mock/flow/${provider_session_id}?email=${encodeURIComponent(email)}`;
  
  return { 
    provider_session_id, 
    url,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
  };
}

// Verificación de webhook (HMAC simple)
export function verifySignature(rawBody, signature) {
  const hmac = crypto.createHmac("sha256", config.kycWebhookSecret);
  hmac.update(rawBody, "utf8");
  const digest = "sha256=" + hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Simular resultado de KYC
export function generateMockResult(sessionId, status = 'approved') {
  return {
    provider_session_id: sessionId,
    status: status,
    result: {
      kyc_level: "basic",
      document_verified: true,
      selfie_match: true,
      liveness_detected: true,
      risk_score: 0.1,
      verification_date: new Date().toISOString(),
      documents: [
        {
          type: "national_id",
          country: "MX",
          verified: true,
          extracted_data: {
            full_name: "Valeria Salazar",
            date_of_birth: "1990-01-01",
            document_number: "12345678"
          }
        }
      ],
      selfie: {
        verified: true,
        liveness_score: 0.95,
        face_match_score: 0.98
      }
    }
  };
}

// Simular webhook payload
export function createMockWebhookPayload(sessionId, status = 'approved') {
  const payload = generateMockResult(sessionId, status);
  const rawBody = JSON.stringify(payload);
  
  // Crear firma HMAC
  const hmac = crypto.createHmac("sha256", config.kycWebhookSecret);
  hmac.update(rawBody, "utf8");
  const signature = "sha256=" + hmac.digest("hex");
  
  return {
    payload,
    rawBody,
    signature
  };
}
