const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool();

/**
 * Optional HTTP authentication middleware
 * Verifies JWT token and adds user info to request
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Sin token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cate',
    });
    
    // Add decoded payload to request
    req.user = payload; // { sub, orgId, role, email, iat, exp, ... }
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Enhanced authentication middleware with database lookup
 * Provides full user and organization information
 */
async function authMiddlewareWithDB(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Sin token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cate',
    });
    
    // Get full user info from database
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id,
              o.name as org_name, o.slug as org_slug, o.api_key
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [payload.sub || payload.id]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    
    // Add both JWT payload and full user info
    req.user = {
      ...payload, // JWT claims
      ...user,    // Database info
      organization: user.organization_id ? {
        id: user.organization_id,
        name: user.org_name,
        slug: user.org_slug,
        api_key: user.api_key
      } : null
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Organization-specific authentication middleware
 * Ensures user belongs to specific organization
 */
function requireOrganization(orgId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    if (req.user.orgId !== parseInt(orgId)) {
      return res.status(403).json({ error: 'Acceso denegado a esta organización' });
    }

    next();
  };
}

/**
 * Role-based authorization middleware
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const roleHierarchy = { 'admin': 3, 'user': 2, 'viewer': 1 };
    const userRole = roleHierarchy[req.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRole < requiredRoleLevel) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cate',
    });
    
    req.user = payload;
    next();
  } catch (err) {
    // Token is invalid, but we don't fail the request
    req.user = null;
    next();
  }
}

/**
 * API Key authentication middleware
 * For organization API access
 */
async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key requerida' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE api_key = $1',
      [apiKey]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'API key inválida' });
    }

    req.organization = result.rows[0];
    next();
  } catch (err) {
    console.error('API key auth error:', err);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
}

module.exports = {
  authMiddleware,
  authMiddlewareWithDB,
  requireOrganization,
  requireRole,
  optionalAuth,
  apiKeyAuth
};
