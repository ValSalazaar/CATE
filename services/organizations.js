const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool();

/**
 * Organization management service for multitenancy
 */
class OrganizationService {
  
  /**
   * Get organization by ID
   */
  async getOrganization(orgId) {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE id = $1',
      [orgId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug) {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new organization
   */
  async createOrganization(name, slug, settings = {}) {
    const apiKey = this.generateApiKey();
    
    const result = await pool.query(
      `INSERT INTO organizations (name, slug, api_key, settings) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, slug, apiKey, JSON.stringify(settings)]
    );
    
    return result.rows[0];
  }

  /**
   * Get organization by wallet address
   */
  async getOrganizationByWallet(address) {
    const result = await pool.query(
      'SELECT get_organization_by_wallet($1) as org_id',
      [address.toLowerCase()]
    );
    
    const orgId = result.rows[0].org_id;
    if (!orgId) return null;
    
    return this.getOrganization(orgId);
  }

  /**
   * Get organization by reference
   */
  async getOrganizationByReference(reference) {
    const result = await pool.query(
      'SELECT get_organization_by_reference($1) as org_id',
      [reference]
    );
    
    const orgId = result.rows[0].org_id;
    if (!orgId) return null;
    
    return this.getOrganization(orgId);
  }

  /**
   * Add wallet to organization
   */
  async addWalletToOrganization(orgId, address, label = null) {
    await pool.query(
      'SELECT update_organization_wallet($1, $2, $3)',
      [orgId, address, label]
    );
    
    return this.getOrganizationWallets(orgId);
  }

  /**
   * Get organization wallets
   */
  async getOrganizationWallets(orgId) {
    const result = await pool.query(
      'SELECT * FROM organization_wallets WHERE organization_id = $1 AND is_active = true',
      [orgId]
    );
    return result.rows;
  }

  /**
   * Create invoice for organization
   */
  async createInvoice(orgId, reference, amount, expectedSender = null, expiresInHours = 24) {
    const result = await pool.query(
      'SELECT create_organization_invoice($1, $2, $3, $4, $5) as invoice_id',
      [orgId, reference, amount, expectedSender, expiresInHours]
    );
    
    return this.getInvoice(result.rows[0].invoice_id);
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId) {
    const result = await pool.query(
      'SELECT * FROM organization_invoices WHERE id = $1',
      [invoiceId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get organization invoices
   */
  async getOrganizationInvoices(orgId, status = null) {
    let query = 'SELECT * FROM organization_invoices WHERE organization_id = $1';
    const params = [orgId];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId, status) {
    const result = await pool.query(
      `UPDATE organization_invoices 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, invoiceId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get users in organization
   */
  async getOrganizationUsers(orgId) {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE organization_id = $1',
      [orgId]
    );
    return result.rows;
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(userId, orgId, role = 'user') {
    const result = await pool.query(
      `UPDATE users 
       SET organization_id = $1, role = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [orgId, role, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if user has access to organization
   */
  async userHasAccess(userId, orgId, requiredRole = 'user') {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND organization_id = $2',
      [userId, orgId]
    );
    
    if (!result.rows[0]) return false;
    
    const userRole = result.rows[0].role;
    const roleHierarchy = { 'admin': 3, 'user': 2, 'viewer': 1 };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Generate API key for organization
   */
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey) {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE api_key = $1',
      [apiKey]
    );
    return result.rows[0] || null;
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(orgId) {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM organization_wallets WHERE organization_id = $1 AND is_active = true) as wallet_count,
        (SELECT COUNT(*) FROM organization_invoices WHERE organization_id = $1) as invoice_count,
        (SELECT COUNT(*) FROM organization_invoices WHERE organization_id = $1 AND status = 'paid') as paid_invoices,
        (SELECT COUNT(*) FROM users WHERE organization_id = $1) as user_count
    `, [orgId]);
    
    return stats.rows[0];
  }
}

module.exports = new OrganizationService();
