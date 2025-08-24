-- Sync state table for tracking blockchain synchronization
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial sync state
INSERT INTO sync_state (key, value) 
VALUES ('last_processed_block', '0')
ON CONFLICT (key) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sync_state_key ON sync_state(key);

-- Function to update sync state
CREATE OR REPLACE FUNCTION update_sync_state(sync_key TEXT, sync_value TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sync_state(key, value, updated_at) 
  VALUES (sync_key, sync_value, CURRENT_TIMESTAMP)
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to get sync state
CREATE OR REPLACE FUNCTION get_sync_state(sync_key TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT value INTO result FROM sync_state WHERE key = sync_key;
  RETURN COALESCE(result, '0');
END;
$$ LANGUAGE plpgsql;
