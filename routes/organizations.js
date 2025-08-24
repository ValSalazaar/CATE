const express = require('express');
const router = express.Router();
const organizationService = require('../services/organizations');
const { authMiddlewareWithDB, requireRole, requireOrganization } = require('../middleware/auth');

// Get organization profile (requires authentication)
router.get('/profile', authMiddlewareWithDB, async (req, res) => {
  try {
    if (!req.user.organization_id) {
      return res.status(404).json({ error: 'Usuario no pertenece a ninguna organización' });
    }

    const organization = await organizationService.getOrganization(req.user.organization_id);
    const stats = await organizationService.getOrganizationStats(req.user.organization_id);
    const wallets = await organizationService.getOrganizationWallets(req.user.organization_id);
    const users = await organizationService.getOrganizationUsers(req.user.organization_id);

    res.json({
      organization,
      stats,
      wallets,
      users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo perfil de organización' });
  }
});

// Get organization wallets (requires user role)
router.get('/wallets', authMiddlewareWithDB, requireRole('user'), async (req, res) => {
  try {
    const wallets = await organizationService.getOrganizationWallets(req.user.organization_id);
    res.json(wallets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo wallets' });
  }
});

// Add wallet to organization (requires admin role)
router.post('/wallets', authMiddlewareWithDB, requireRole('admin'), async (req, res) => {
  try {
    const { address, label } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Dirección de wallet requerida' });
    }

    const wallets = await organizationService.addWalletToOrganization(
      req.user.organization_id,
      address,
      label
    );

    res.json(wallets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando wallet' });
  }
});

// Get organization invoices (requires user role)
router.get('/invoices', authMiddlewareWithDB, requireRole('user'), async (req, res) => {
  try {
    const { status } = req.query;
    const invoices = await organizationService.getOrganizationInvoices(
      req.user.organization_id,
      status
    );
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo facturas' });
  }
});

// Create invoice (requires user role)
router.post('/invoices', authMiddlewareWithDB, requireRole('user'), async (req, res) => {
  try {
    const { reference, amount, expected_sender, expires_in_hours } = req.body;
    
    if (!reference || !amount) {
      return res.status(400).json({ error: 'Referencia y monto requeridos' });
    }

    const invoice = await organizationService.createInvoice(
      req.user.organization_id,
      reference,
      amount,
      expected_sender,
      expires_in_hours || 24
    );

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando factura' });
  }
});

// Update invoice status (requires admin role)
router.patch('/invoices/:invoiceId', authMiddlewareWithDB, requireRole('admin'), async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Estado requerido' });
    }

    const invoice = await organizationService.updateInvoiceStatus(invoiceId, status);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando factura' });
  }
});

// Get organization users (requires admin role)
router.get('/users', authMiddlewareWithDB, requireRole('admin'), async (req, res) => {
  try {
    const users = await organizationService.getOrganizationUsers(req.user.organization_id);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Add user to organization (requires admin role)
router.post('/users', authMiddlewareWithDB, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, role } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    const user = await organizationService.addUserToOrganization(
      user_id,
      req.user.organization_id,
      role || 'user'
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando usuario' });
  }
});

// Get organization statistics (requires user role)
router.get('/stats', authMiddlewareWithDB, requireRole('user'), async (req, res) => {
  try {
    const stats = await organizationService.getOrganizationStats(req.user.organization_id);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
