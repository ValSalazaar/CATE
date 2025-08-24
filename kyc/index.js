// kyc/index.js
import { config } from "../config/env.js";
import * as mock from "./providers/mock.js";

export const kyc = {
  async start(params) {
    if (config.kycProvider === "mock") return mock.startSession(params);
    throw new Error("KYC provider no implementado");
  },
  
  verifySignature(rawBody, signature) {
    if (config.kycProvider === "mock") return mock.verifySignature(rawBody, signature);
    return false;
  },
  
  // Utility functions
  generateMockResult(sessionId, status) {
    if (config.kycProvider === "mock") return mock.generateMockResult(sessionId, status);
    return null;
  },
  
  createMockWebhookPayload(sessionId, status) {
    if (config.kycProvider === "mock") return mock.createMockWebhookPayload(sessionId, status);
    return null;
  }
};

// KYC Session management
export class KYCSessionManager {
  constructor() {
    this.provider = config.kycProvider;
  }
  
  async createSession(userId, email) {
    return await kyc.start({ userId, email });
  }
  
  async verifyWebhook(rawBody, signature) {
    return kyc.verifySignature(rawBody, signature);
  }
  
  // Mock utilities for testing
  createMockApproval(sessionId) {
    return kyc.createMockWebhookPayload(sessionId, 'approved');
  }
  
  createMockRejection(sessionId) {
    return kyc.createMockWebhookPayload(sessionId, 'rejected');
  }
}
