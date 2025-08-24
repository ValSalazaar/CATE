-- Migration: Create Verifiable Credentials Tables
-- Description: Estructura completa para sistema de credenciales verificables con KYC

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios (simplificado)
CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  eth_address TEXT UNIQUE, -- address del sujeto
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones KYC
CREATE TABLE IF NOT EXISTS kyc_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'mock' | 'sumsub' | 'persona' ...
  provider_session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credenciales emitidas
CREATE TABLE IF NOT EXISTS credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  subject_address TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  onchain_id TEXT UNIQUE, -- bytes32 (0x...)
  metadata_hash TEXT NOT NULL, -- 0x...
  metadata_ciphertext TEXT NOT NULL, -- base64(iv|cipher|tag)
  schema TEXT NOT NULL, -- identificador del schema de VC
  status TEXT NOT NULL CHECK (status IN ('active','revoked')),
  kyc_session_id UUID REFERENCES kyc_session(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_app_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_app_user_eth_address ON app_user(eth_address);
CREATE INDEX IF NOT EXISTS idx_kyc_session_user_id ON kyc_session(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_session_provider_session_id ON kyc_session(provider_session_id);
CREATE INDEX IF NOT EXISTS idx_kyc_session_status ON kyc_session(status);
CREATE INDEX IF NOT EXISTS idx_credential_user_id ON credential(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_subject_address ON credential(subject_address);
CREATE INDEX IF NOT EXISTS idx_credential_issuer_address ON credential(issuer_address);
CREATE INDEX IF NOT EXISTS idx_credential_onchain_id ON credential(onchain_id);
CREATE INDEX IF NOT EXISTS idx_credential_schema ON credential(schema);
CREATE INDEX IF NOT EXISTS idx_credential_status ON credential(status);
CREATE INDEX IF NOT EXISTS idx_credential_kyc_session_id ON credential(kyc_session_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kyc_session_updated_at 
    BEFORE UPDATE ON kyc_session 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credential_updated_at 
    BEFORE UPDATE ON credential 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo para testing
INSERT INTO app_user (email, eth_address) VALUES 
  ('valeria@cate.com', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'),
  ('carlos@cate.com', '0x1234567890123456789012345678901234567890'),
  ('ana@cate.com', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
ON CONFLICT (email) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE app_user IS 'Usuarios de la aplicación con direcciones Ethereum';
COMMENT ON TABLE kyc_session IS 'Sesiones de verificación de identidad (KYC)';
COMMENT ON TABLE credential IS 'Credenciales verificables emitidas y almacenadas off-chain';

COMMENT ON COLUMN app_user.eth_address IS 'Dirección Ethereum del usuario (sujeto de credenciales)';
COMMENT ON COLUMN kyc_session.provider IS 'Proveedor de KYC (mock, sumsub, persona, etc.)';
COMMENT ON COLUMN kyc_session.provider_session_id IS 'ID de sesión del proveedor de KYC';
COMMENT ON COLUMN kyc_session.result_json IS 'Resultado completo del proceso KYC en formato JSON';
COMMENT ON COLUMN credential.onchain_id IS 'ID único de la credencial en blockchain (bytes32)';
COMMENT ON COLUMN credential.metadata_hash IS 'Hash SHA256 de los metadatos (almacenado en blockchain)';
COMMENT ON COLUMN credential.metadata_ciphertext IS 'Metadatos cifrados con AES-256-GCM (base64)';
COMMENT ON COLUMN credential.schema IS 'Identificador del schema de la credencial (ej: cate/v1/identity)';
