// config/env.js
export const config = {
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.PRIVATE_KEY, // emisor autorizado
  vcContractAddress: process.env.VC_CONTRACT_ADDRESS,
  kycProvider: process.env.KYC_PROVIDER || "mock",
  kycWebhookSecret: process.env.KYC_WEBHOOK_SECRET, // HMAC verificación
  db: {
    url: process.env.DATABASE_URL
  },
  crypto: {
    key: process.env.ENCRYPTION_KEY // 32 bytes en hex (64 chars) para AES-256-GCM
  },
  server: {
    port: process.env.PORT || 4000,
    corsOrigin: process.env.CORS_ORIGIN || "*"
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  }
};

// Validación de configuración requerida
export function validateConfig() {
  const required = [
    'RPC_URL',
    'PRIVATE_KEY', 
    'VC_CONTRACT_ADDRESS',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'KYC_WEBHOOK_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validar que ENCRYPTION_KEY sea de 64 caracteres hex
  if (process.env.ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
    throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters');
  }

  console.log('✅ Configuration validated successfully');
}
