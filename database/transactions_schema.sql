-- Transactions table for storing blockchain payments
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(42) NOT NULL, -- Ethereum address (0x...)
    receiver VARCHAR(42) NOT NULL, -- Ethereum address (0x...)
    amount_wei VARCHAR(78) NOT NULL, -- Amount in wei (uint256)
    amount_formatted VARCHAR(50) NOT NULL, -- Formatted amount (e.g., "100.50")
    token_symbol VARCHAR(10) NOT NULL, -- Token symbol (e.g., "MATIC", "USDC")
    tx_hash VARCHAR(66) NOT NULL, -- Transaction hash
    log_index INTEGER NOT NULL, -- Log index in the transaction
    block_number BIGINT NOT NULL,
    chain_id INTEGER NOT NULL, -- Chain ID (e.g., 137 for Polygon)
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
    occurred_at TIMESTAMP NOT NULL, -- Block timestamp
    reference VARCHAR(66), -- Reference ID from the event
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, log_index)
);

-- Error logs table for debugging
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_message TEXT NOT NULL,
    event_data JSONB,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_sender_timestamp ON transactions(sender, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_timestamp ON transactions(receiver, timestamp);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View for recent transactions
CREATE OR REPLACE VIEW recent_transactions AS
SELECT 
    id,
    sender,
    receiver,
    amount,
    tx_hash,
    block_number,
    to_timestamp(timestamp) as transaction_time,
    status,
    created_at
FROM transactions 
ORDER BY timestamp DESC 
LIMIT 100;

-- Function to get transaction statistics
CREATE OR REPLACE FUNCTION get_transaction_stats()
RETURNS TABLE(
    total_transactions BIGINT,
    total_amount NUMERIC,
    unique_senders BIGINT,
    unique_receivers BIGINT,
    last_transaction_time TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount,
        COUNT(DISTINCT sender) as unique_senders,
        COUNT(DISTINCT receiver) as unique_receivers,
        MAX(to_timestamp(timestamp)) as last_transaction_time
    FROM transactions
    WHERE status = 'confirmed';
END;
$$ LANGUAGE plpgsql;
