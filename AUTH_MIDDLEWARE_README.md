# CATE - Authentication Middleware

Sistema de middleware de autenticación HTTP opcional con diferentes niveles de protección y acceso a información de organización.

## 🔐 Middleware Disponibles

### 1. `authMiddleware` - Autenticación Básica

Verifica JWT y agrega payload a `req.user` sin consultar base de datos.

```javascript
const { authMiddleware } = require('../middleware/auth');

// Uso básico
router.get('/protected', authMiddleware, (req, res) => {
  // req.user contiene: { sub, orgId, role, email, iat, exp, ... }
  res.json({ user: req.user });
});
```

### 2. `authMiddlewareWithDB` - Autenticación Completa

Verifica JWT y obtiene información completa del usuario desde la base de datos.

```javascript
const { authMiddlewareWithDB } = require('../middleware/auth');

router.get('/profile', authMiddlewareWithDB, (req, res) => {
  // req.user contiene información completa:
  // { sub, orgId, role, email, id, name, organization_id, org_name, org_slug, organization: {...} }
  res.json({ user: req.user });
});
```

### 3. `optionalAuth` - Autenticación Opcional

Agrega información de usuario si el token está presente, pero no falla si no hay token.

```javascript
const { optionalAuth } = require('../middleware/auth');

router.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    // Usuario autenticado
    res.json({ message: 'Hola usuario', user: req.user });
  } else {
    // Usuario no autenticado
    res.json({ message: 'Hola visitante' });
  }
});
```

### 4. `requireRole` - Autorización por Rol

Verifica que el usuario tenga el rol requerido.

```javascript
const { authMiddlewareWithDB, requireRole } = require('../middleware/auth');

// Requiere rol de admin
router.post('/admin-only', authMiddlewareWithDB, requireRole('admin'), (req, res) => {
  res.json({ message: 'Solo admins pueden ver esto' });
});

// Requiere rol de user o superior
router.get('/user-content', authMiddlewareWithDB, requireRole('user'), (req, res) => {
  res.json({ message: 'Contenido para usuarios' });
});
```

### 5. `requireOrganization` - Verificación de Organización

Verifica que el usuario pertenezca a una organización específica.

```javascript
const { authMiddlewareWithDB, requireOrganization } = require('../middleware/auth');

router.get('/org/:orgId/data', 
  authMiddlewareWithDB, 
  requireOrganization(':orgId'), 
  (req, res) => {
    res.json({ message: 'Datos de la organización' });
  }
);
```

### 6. `apiKeyAuth` - Autenticación por API Key

Autenticación para organizaciones usando API keys.

```javascript
const { apiKeyAuth } = require('../middleware/auth');

router.get('/api/data', apiKeyAuth, (req, res) => {
  // req.organization contiene la información de la organización
  res.json({ 
    message: 'Datos para organización',
    organization: req.organization 
  });
});
```

## 🛠️ Uso en Rutas

### Rutas Protegidas

```javascript
const express = require('express');
const router = express.Router();
const { authMiddlewareWithDB, requireRole } = require('../middleware/auth');

// Ruta que requiere autenticación
router.get('/dashboard', authMiddlewareWithDB, (req, res) => {
  res.json({
    user: req.user,
    organization: req.user.organization
  });
});

// Ruta que requiere rol específico
router.post('/create-invoice', 
  authMiddlewareWithDB, 
  requireRole('user'), 
  (req, res) => {
    // Solo usuarios con rol 'user' o superior pueden acceder
    res.json({ message: 'Factura creada' });
  }
);

// Ruta para admins
router.delete('/users/:userId', 
  authMiddlewareWithDB, 
  requireRole('admin'), 
  (req, res) => {
    // Solo admins pueden eliminar usuarios
    res.json({ message: 'Usuario eliminado' });
  }
);
```

### Rutas Públicas con Autenticación Opcional

```javascript
const { optionalAuth } = require('../middleware/auth');

// Ruta pública que muestra contenido personalizado si está autenticado
router.get('/welcome', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      message: `Bienvenido ${req.user.name}`,
      organization: req.user.organization?.name || 'Sin organización'
    });
  } else {
    res.json({
      message: 'Bienvenido visitante',
      loginUrl: '/auth/login'
    });
  }
});
```

## 📊 Información Disponible en `req.user`

### Con `authMiddleware` (solo JWT):

```javascript
{
  sub: 123,              // User ID
  orgId: 456,            // Organization ID
  role: 'admin',         // User role
  email: 'user@example.com',
  iat: 1640995200,       // Issued at
  exp: 1640998800        // Expires at
}
```

### Con `authMiddlewareWithDB` (completo):

```javascript
{
  // JWT claims
  sub: 123,
  orgId: 456,
  role: 'admin',
  email: 'user@example.com',
  iat: 1640995200,
  exp: 1640998800,
  
  // Database info
  id: 123,
  name: 'John Doe',
  organization_id: 456,
  org_name: 'Example Corp',
  org_slug: 'example-corp',
  
  // Organization object
  organization: {
    id: 456,
    name: 'Example Corp',
    slug: 'example-corp',
    api_key: 'abc123...'
  }
}
```

## 🔒 Jerarquía de Roles

```javascript
const roleHierarchy = {
  'admin': 3,   // Acceso completo
  'user': 2,    // Acceso limitado
  'viewer': 1   // Solo lectura
};
```

### Permisos por Rol:

- **Admin (3)**: Gestión completa, puede hacer todo
- **User (2)**: Puede crear facturas, ver datos
- **Viewer (1)**: Solo puede ver datos

## 🚨 Manejo de Errores

### Errores Comunes:

```javascript
// 401 - Sin token
{ error: 'Sin token' }

// 401 - Token inválido
{ error: 'Token inválido' }

// 401 - Usuario no encontrado
{ error: 'Usuario no encontrado' }

// 403 - Permisos insuficientes
{ error: 'Permisos insuficientes' }

// 403 - Acceso denegado a organización
{ error: 'Acceso denegado a esta organización' }
```

### Logs de Debugging:

```javascript
// JWT verification error
console.error('JWT verification error:', err.message);

// Auth middleware error
console.error('Auth middleware error:', err.message);

// API key auth error
console.error('API key auth error:', err);
```

## 🔄 Ejemplos de Uso

### 1. Dashboard de Usuario

```javascript
router.get('/dashboard', authMiddlewareWithDB, (req, res) => {
  const { user } = req;
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    organization: user.organization,
    permissions: {
      canCreateInvoices: ['user', 'admin'].includes(user.role),
      canManageUsers: user.role === 'admin',
      canViewStats: ['user', 'admin'].includes(user.role)
    }
  });
});
```

### 2. Crear Factura

```javascript
router.post('/invoices', 
  authMiddlewareWithDB, 
  requireRole('user'), 
  async (req, res) => {
    const { reference, amount } = req.body;
    const { organization_id } = req.user;
    
    const invoice = await organizationService.createInvoice(
      organization_id,
      reference,
      amount
    );
    
    res.json(invoice);
  }
);
```

### 3. Gestión de Usuarios (Solo Admin)

```javascript
router.post('/users', 
  authMiddlewareWithDB, 
  requireRole('admin'), 
  async (req, res) => {
    const { user_id, role } = req.body;
    const { organization_id } = req.user;
    
    const user = await organizationService.addUserToOrganization(
      user_id,
      organization_id,
      role
    );
    
    res.json(user);
  }
);
```

### 4. API Key Access

```javascript
router.get('/api/transactions', apiKeyAuth, async (req, res) => {
  const { organization } = req;
  
  const transactions = await getOrganizationTransactions(organization.id);
  
  res.json({
    organization: organization.name,
    transactions
  });
});
```

## 🛡️ Seguridad

### Mejores Prácticas:

1. **Usar `authMiddlewareWithDB`** para rutas que necesiten información completa
2. **Usar `requireRole`** para control de acceso granular
3. **Validar organización** cuando sea necesario
4. **Logs de auditoría** para acciones críticas
5. **Rate limiting** por usuario/organización

### Validación de Tokens:

```javascript
// Verificación estricta
const payload = jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256'],  // Solo HS256
  issuer: 'cate',        // Issuer específico
  // audience: `org:${orgId}` // Opcional: audience específico
});
```

## 📈 Próximos Pasos

1. **Rate Limiting**: Límites por usuario y organización
2. **Auditoría**: Logs detallados de acceso
3. **Caché**: Cachear información de usuario
4. **Multi-org**: Usuarios en múltiples organizaciones
5. **SSO**: Integración con proveedores externos
6. **Webhooks**: Notificaciones de eventos de autenticación
