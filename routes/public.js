const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

// Public endpoint that shows different content based on authentication
router.get('/info', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({
      message: 'Información pública',
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
        organization: req.user.orgId ? `org:${req.user.orgId}` : 'none'
      },
      authenticated: true
    });
  } else {
    // User is not authenticated
    res.json({
      message: 'Información pública',
      user: null,
      authenticated: false,
      note: 'Inicia sesión para ver información personalizada'
    });
  }
});

// Public endpoint for system status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public endpoint that shows organization info if authenticated
router.get('/organization-info', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({
      message: 'Inicia sesión para ver información de tu organización',
      authenticated: false
    });
  }

  if (!req.user.orgId) {
    return res.json({
      message: 'No perteneces a ninguna organización',
      authenticated: true,
      organization: null
    });
  }

  res.json({
    message: 'Información de tu organización',
    authenticated: true,
    organization: {
      id: req.user.orgId,
      role: req.user.role
    }
  });
});

module.exports = router;
