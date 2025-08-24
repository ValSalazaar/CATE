-- Multitenancy schema for organization-based event privacy

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  api_key VARCHAR(255) UNIQUE,
  webhook_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization wallets (for mapping addresses to orgs)
CREATE TABLE IF NOT EXISTS organization_wallets (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL, -- Ethereum address
  label VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, address)
);

-- Organization invoices (for mapping references to orgs)
CREATE TABLE IF NOT EXISTS organization_invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference VARCHAR(66) NOT NULL, -- bytes32 reference
  amount_wei VARCHAR(78),
  expected_sender VARCHAR(42),
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, expired, cancelled
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, reference)
);

-- Update users table to include organization
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'; -- admin, user, viewer

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_wallets_address ON organization_wallets(address);
CREATE INDEX IF NOT EXISTS idx_org_wallets_org_id ON organization_wallets(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invoices_reference ON organization_invoices(reference);
CREATE INDEX IF NOT EXISTS idx_org_invoices_org_id ON organization_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);

-- Function to get organization by wallet address
CREATE OR REPLACE FUNCTION get_organization_by_wallet(wallet_address VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
  org_id INTEGER;
BEGIN
  SELECT organization_id INTO org_id 
  FROM organization_wallets 
  WHERE address = LOWER(wallet_address) AND is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization by reference
CREATE OR REPLACE FUNCTION get_organization_by_reference(ref VARCHAR(66))
RETURNS INTEGER AS $$
DECLARE
  org_id INTEGER;
BEGIN
  SELECT organization_id INTO org_id 
  FROM organization_invoices 
  WHERE reference = ref
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update organization wallet
CREATE OR REPLACE FUNCTION update_organization_wallet(
  org_id INTEGER,
  wallet_address VARCHAR(42),
  wallet_label VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO organization_wallets (organization_id, address, label)
  VALUES (org_id, LOWER(wallet_address), wallet_label)
  ON CONFLICT (organization_id, address) 
  DO UPDATE SET 
    label = COALESCE(EXCLUDED.label, organization_wallets.label),
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to create organization invoice
CREATE OR REPLACE FUNCTION create_organization_invoice(
  org_id INTEGER,
  ref VARCHAR(66),
  amount VARCHAR(78),
  sender VARCHAR(42) DEFAULT NULL,
  expires_in_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
  invoice_id INTEGER;
BEGIN
  INSERT INTO organization_invoices (
    organization_id, 
    reference, 
    amount_wei, 
    expected_sender, 
    expires_at
  )
  VALUES (
    org_id, 
    ref, 
    amount, 
    sender, 
    CURRENT_TIMESTAMP + INTERVAL '1 hour' * expires_in_hours
  )
  RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;
