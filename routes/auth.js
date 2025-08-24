const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { Pool } = require('pg');
const organizationService = require('../services/organizations');

const pool = new Pool(); // Usa variables de entorno para conexión

// Middleware to verify JWT and add user info to request
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cate'
    });
    
    // Get user with organization info
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id, 
              o.name as org_name, o.slug as org_slug
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [decoded.sub || decoded.id]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

router.post('/register', async (req, res) => {
  const { email, password, name, organization_slug } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    let organizationId = null;

    // If organization_slug provided, find or create organization
    if (organization_slug) {
      let org = await organizationService.getOrganizationBySlug(organization_slug);
      
      if (!org) {
        // Create organization if it doesn't exist
        org = await organizationService.createOrganization(
          `${name}'s Organization`,
          organization_slug
        );
      }
      
      organizationId = org.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password, name, organization_id, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, organization_id, role`,
      [email, hashedPassword, name, organizationId, organizationId ? 'admin' : 'user']
    );

    // Generate JWT with proper claims
    const payload = {
      sub: result.rows[0].id,
      orgId: result.rows[0].organization_id,
      role: result.rows[0].role,
      email: result.rows[0].email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h', // Short-lived token for security
      issuer: 'cate',
      // Optional: tie token to organization in audience
      audience: result.rows[0].organization_id ? `org:${result.rows[0].organization_id}` : 'public'
    });

    // Generate refresh token
    const refreshToken = jwt.sign({
      sub: result.rows[0].id,
      type: 'refresh'
    }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'cate'
    });

    res.json({ 
      user: result.rows[0], 
      token,
      refreshToken,
      expiresIn: 3600 // 1 hour
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el registro' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.password, u.role, u.organization_id,
              o.name as org_name, o.slug as org_slug
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generate JWT with proper claims
    const payload = {
      sub: user.id,
      orgId: user.organization_id,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h', // Short-lived token for security
      issuer: 'cate',
      // Optional: tie token to organization in audience
      audience: user.organization_id ? `org:${user.organization_id}` : 'public'
    });

    // Generate refresh token
    const refreshToken = jwt.sign({
      sub: user.id,
      type: 'refresh'
    }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'cate'
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        org_name: user.org_name,
        org_slug: user.org_slug
      },
      token,
      refreshToken,
      expiresIn: 3600 // 1 hour
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requerido' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Get user info
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id,
              o.name as org_name, o.slug as org_slug
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [decoded.sub]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Generate new access token
    const payload = {
      sub: user.id,
      orgId: user.organization_id,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'cate',
      // Optional: tie token to organization in audience
      audience: user.organization_id ? `org:${user.organization_id}` : 'public'
    });

    res.json({
      token,
      expiresIn: 3600
    });
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: 'Refresh token inválido' });
  }
});

// Protected route example
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
