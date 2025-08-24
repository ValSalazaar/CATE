-- migrations/202408_add_chain_columns.sql
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS amount_wei TEXT,
  ADD COLUMN IF NOT EXISTS amount_formatted TEXT,
  ADD COLUMN IF NOT EXISTS token_symbol TEXT,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS log_index INTEGER,
  ADD COLUMN IF NOT EXISTS block_number INTEGER,
  ADD COLUMN IF NOT EXISTS chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reference TEXT;

-- Evita duplicados cuando se reprocesan eventos
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_tx_log ON transactions(tx_hash, log_index);

-- Migrar datos existentes si es necesario
UPDATE transactions 
SET 
  amount_wei = amount,
  amount_formatted = amount,
  token_symbol = 'MATIC',
  tx_hash = COALESCE(tx_hash, 'legacy_' || id),
  log_index = COALESCE(log_index, 0),
  block_number = COALESCE(block_number, 0),
  chain_id = COALESCE(chain_id, 137),
  status = COALESCE(status, 'confirmed'),
  occurred_at = COALESCE(occurred_at, to_timestamp(timestamp))
WHERE amount_wei IS NULL;

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_transactions_token_symbol ON transactions(token_symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
