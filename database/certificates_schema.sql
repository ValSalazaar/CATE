-- CATE Certificates Database Schema
-- This schema supports certificate issuance and verification

-- Table for authorized issuers
CREATE TABLE IF NOT EXISTS issuers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address format
    organization_id INTEGER REFERENCES organizations(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for certificates
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
    issuer_id INTEGER NOT NULL REFERENCES issuers(id),
    organization_id INTEGER REFERENCES organizations(id),
    tx_hash VARCHAR(66), -- Blockchain transaction hash
    block_number INTEGER,
    metadata JSONB DEFAULT '{}',
    cert_data JSONB NOT NULL, -- Original certificate data
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'revoked', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for certificate verification logs
CREATE TABLE IF NOT EXISTS certificate_verifications (
    id SERIAL PRIMARY KEY,
    certificate_id INTEGER REFERENCES certificates(id),
    verifier_ip INET,
    verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('valid', 'invalid', 'revoked', 'expired', 'issuer_not_found')),
    verification_details JSONB DEFAULT '{}',
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_hash ON certificates(hash);
CREATE INDEX IF NOT EXISTS idx_certificates_issuer_id ON certificates(issuer_id);
CREATE INDEX IF NOT EXISTS idx_certificates_organization_id ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_tx_hash ON certificates(tx_hash);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at);
CREATE INDEX IF NOT EXISTS idx_issuers_wallet_address ON issuers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_issuers_organization_id ON issuers(organization_id);
CREATE INDEX IF NOT EXISTS idx_verifications_certificate_id ON certificate_verifications(certificate_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verified_at ON certificate_verifications(verified_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON issuers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get certificate with issuer details
CREATE OR REPLACE FUNCTION get_certificate_with_issuer(cert_hash VARCHAR)
RETURNS TABLE (
    cert_id INTEGER,
    cert_hash VARCHAR,
    issuer_name VARCHAR,
    issuer_wallet VARCHAR,
    organization_name VARCHAR,
    tx_hash VARCHAR,
    block_number INTEGER,
    cert_data JSONB,
    status VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.hash,
        i.name as issuer_name,
        i.wallet_address as issuer_wallet,
        o.name as organization_name,
        c.tx_hash,
        c.block_number,
        c.cert_data,
        c.status,
        c.created_at
    FROM certificates c
    JOIN issuers i ON c.issuer_id = i.id
    LEFT JOIN organizations o ON c.organization_id = o.id
    WHERE c.hash = cert_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to get certificates by organization
CREATE OR REPLACE FUNCTION get_certificates_by_organization(org_id INTEGER)
RETURNS TABLE (
    cert_id INTEGER,
    cert_hash VARCHAR,
    issuer_name VARCHAR,
    issuer_wallet VARCHAR,
    tx_hash VARCHAR,
    status VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.hash,
        i.name as issuer_name,
        i.wallet_address as issuer_wallet,
        c.tx_hash,
        c.status,
        c.created_at
    FROM certificates c
    JOIN issuers i ON c.issuer_id = i.id
    WHERE c.organization_id = org_id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get issuer statistics
CREATE OR REPLACE FUNCTION get_issuer_stats(issuer_wallet VARCHAR)
RETURNS TABLE (
    total_certificates BIGINT,
    active_certificates BIGINT,
    revoked_certificates BIGINT,
    last_issued_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_certificates,
        COUNT(*) FILTER (WHERE c.status = 'registered') as active_certificates,
        COUNT(*) FILTER (WHERE c.status = 'revoked') as revoked_certificates,
        MAX(c.created_at) as last_issued_at
    FROM certificates c
    JOIN issuers i ON c.issuer_id = i.id
    WHERE i.wallet_address = issuer_wallet;
END;
$$ LANGUAGE plpgsql;

-- Function to verify certificate integrity
CREATE OR REPLACE FUNCTION verify_certificate_integrity(cert_hash VARCHAR)
RETURNS TABLE (
    is_valid BOOLEAN,
    issuer_wallet VARCHAR,
    issuer_status VARCHAR,
    cert_status VARCHAR,
    verification_message TEXT
) AS $$
DECLARE
    cert_record RECORD;
    issuer_record RECORD;
BEGIN
    -- Get certificate
    SELECT * INTO cert_record FROM certificates WHERE hash = cert_hash;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            '' as issuer_wallet,
            '' as issuer_status,
            '' as cert_status,
            'Certificate not found' as verification_message;
        RETURN;
    END IF;
    
    -- Get issuer
    SELECT * INTO issuer_record FROM issuers WHERE id = cert_record.issuer_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            '' as issuer_wallet,
            '' as issuer_status,
            cert_record.status as cert_status,
            'Issuer not found' as verification_message;
        RETURN;
    END IF;
    
    -- Check if issuer is active
    IF issuer_record.status != 'active' THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            issuer_record.wallet_address as issuer_wallet,
            issuer_record.status as issuer_status,
            cert_record.status as cert_status,
            'Issuer is not active' as verification_message;
        RETURN;
    END IF;
    
    -- Check if certificate is valid
    IF cert_record.status != 'registered' THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            issuer_record.wallet_address as issuer_wallet,
            issuer_record.status as issuer_status,
            cert_record.status as cert_status,
            'Certificate is ' || cert_record.status as verification_message;
        RETURN;
    END IF;
    
    -- Certificate is valid
    RETURN QUERY SELECT 
        TRUE as is_valid,
        issuer_record.wallet_address as issuer_wallet,
        issuer_record.status as issuer_status,
        cert_record.status as cert_status,
        'Certificate is valid' as verification_message;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO issuers (name, wallet_address, organization_id, status) VALUES
('CATE System', '0x0000000000000000000000000000000000000000', NULL, 'active'),
('Test University', '0x1111111111111111111111111111111111111111', 1, 'active'),
('Test Company', '0x2222222222222222222222222222222222222222', 2, 'active')
ON CONFLICT (wallet_address) DO NOTHING;

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE ON certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issuers TO authenticated;
GRANT SELECT, INSERT ON certificate_verifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_certificate_with_issuer(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_certificates_by_organization(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_issuer_stats(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_certificate_integrity(VARCHAR) TO authenticated;
