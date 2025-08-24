const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const pool = new Pool();
const organizationService = require('../services/organizations');
const { authMiddlewareWithDB, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/', authMiddlewareWithDB, async (req, res) => {
  try {
    let query = `
      SELECT
        t.id,
        t.sender,
        t.receiver,
        COALESCE(t.amount_wei, t.amount) as amount_wei,
        COALESCE(t.amount_formatted, t.amount) as amount_formatted,
        COALESCE(t.token_symbol, 'MATIC') as token_symbol,
        COALESCE(t.tx_hash, 'legacy_' || t.id) as tx_hash,
        COALESCE(t.log_index, 0) as log_index,
        COALESCE(t.block_number, 0) as block_number,
        COALESCE(t.chain_id, 137) as chain_id,
        COALESCE(t.status, 'confirmed') as status,
        COALESCE(t.occurred_at, to_timestamp(t.timestamp)) as occurred_at,
        t.reference,
        t.created_at,
        t.updated_at
      FROM transactions t
    `;
    
    const params = [];
    let paramIndex = 1;

    // Filter by organization if user belongs to one
    if (req.user.organization_id) {
      query += `
        WHERE (
          -- Transactions where receiver is organization wallet
          EXISTS (
            SELECT 1 FROM organization_wallets ow 
            WHERE ow.organization_id = $${paramIndex} 
            AND ow.address = LOWER(t.receiver)
            AND ow.is_active = true
          )
          OR
          -- Transactions where sender is organization wallet
          EXISTS (
            SELECT 1 FROM organization_wallets ow 
            WHERE ow.organization_id = $${paramIndex} 
            AND ow.address = LOWER(t.sender)
            AND ow.is_active = true
          )
          OR
          -- Transactions with organization reference
          EXISTS (
            SELECT 1 FROM organization_invoices oi 
            WHERE oi.organization_id = $${paramIndex} 
            AND oi.reference = t.reference
          )
        )
      `;
      params.push(req.user.organization_id);
      paramIndex++;
    }

    // Add status filter if provided
    if (req.query.status) {
      const operator = req.user.organization_id ? 'AND' : 'WHERE';
      query += ` ${operator} COALESCE(t.status, 'confirmed') = $${paramIndex}`;
      params.push(req.query.status);
      paramIndex++;
    }

    // Add limit if provided
    if (req.query.limit) {
      query += ` ORDER BY COALESCE(t.occurred_at, t.created_at) DESC LIMIT $${paramIndex}`;
      params.push(parseInt(req.query.limit));
    } else {
      query += ` ORDER BY COALESCE(t.occurred_at, t.created_at) DESC`;
    }

    const result = await pool.query(query, params);
    
    res.json({
      transactions: result.rows,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        organization: req.user.organization_id ? {
          id: req.user.organization_id,
          name: req.user.org_name,
          slug: req.user.org_slug
        } : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo transacciones' });
  }
});

// Get organization-specific transactions
router.get('/organization/:orgId', authMiddlewareWithDB, requireRole('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if user belongs to this organization
    if (req.user.organization_id !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Acceso denegado a esta organización' });
    }

    const result = await pool.query(`
      SELECT
        t.id,
        t.sender,
        t.receiver,
        COALESCE(t.amount_wei, t.amount) as amount_wei,
        COALESCE(t.amount_formatted, t.amount) as amount_formatted,
        COALESCE(t.token_symbol, 'MATIC') as token_symbol,
        COALESCE(t.tx_hash, 'legacy_' || t.id) as tx_hash,
        COALESCE(t.log_index, 0) as log_index,
        COALESCE(t.block_number, 0) as block_number,
        COALESCE(t.chain_id, 137) as chain_id,
        COALESCE(t.status, 'confirmed') as status,
        COALESCE(t.occurred_at, to_timestamp(t.timestamp)) as occurred_at,
        t.reference,
        t.created_at,
        t.updated_at
      FROM transactions t
      WHERE (
        EXISTS (
          SELECT 1 FROM organization_wallets ow 
          WHERE ow.organization_id = $1 
          AND ow.address = LOWER(t.receiver)
          AND ow.is_active = true
        )
        OR
        EXISTS (
          SELECT 1 FROM organization_wallets ow 
          WHERE ow.organization_id = $1 
          AND ow.address = LOWER(t.sender)
          AND ow.is_active = true
        )
        OR
        EXISTS (
          SELECT 1 FROM organization_invoices oi 
          WHERE oi.organization_id = $1 
          AND oi.reference = t.reference
        )
      )
      ORDER BY COALESCE(t.occurred_at, t.created_at) DESC
    `, [orgId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo transacciones de la organización' });
  }
});

module.exports = router;
