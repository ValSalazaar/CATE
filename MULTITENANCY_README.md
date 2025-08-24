# CATE - Multitenancy & JWT Authentication

Sistema de multitenencia con autenticación JWT robusta y privacidad de eventos por organización.

## 🏢 Características de Multitenencia

### ✅ Organizaciones y Usuarios

- **Organizaciones**: Entidades independientes con sus propios datos
- **Usuarios**: Miembros de organizaciones con roles específicos
- **Wallets**: Direcciones blockchain asociadas a organizaciones
- **Facturas**: Referencias de pago vinculadas a organizaciones

### 🔐 Autenticación JWT Robusta

- **Tokens Cortos**: 1 hora de duración para mayor seguridad
- **Refresh Tokens**: 7 días para renovación automática
- **Claims Estructurados**: `sub`, `orgId`, `role`, `email`
- **Audience Binding**: Tokens vinculados a organizaciones específicas

## 🗄️ Base de Datos

### Tablas Principales

```sql
-- Organizaciones
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  api_key VARCHAR(255) UNIQUE,
  webhook_url VARCHAR(500),
  settings JSONB DEFAULT '{}'
);

-- Wallets de organizaciones
CREATE TABLE organization_wallets (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  address VARCHAR(42) NOT NULL, -- Ethereum address
  label VARCHAR(255),
  is_active BOOLEAN DEFAULT true
);

-- Facturas de organizaciones
CREATE TABLE organization_invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  reference VARCHAR(66) NOT NULL, -- bytes32 reference
  amount_wei VARCHAR(78),
  expected_sender VARCHAR(42),
  status VARCHAR(20) DEFAULT 'pending'
);

-- Usuarios con organización
ALTER TABLE users 
ADD COLUMN organization_id INTEGER REFERENCES organizations(id),
ADD COLUMN role VARCHAR(50) DEFAULT 'user';
```

## 🔐 JWT Authentication

### Claims Estructurados

```javascript
const payload = {
  sub: user.id,           // Subject (user ID)
  orgId: user.orgId,      // Organization ID
  role: user.role,        // User role (admin, user, viewer)
  email: user.email       // User email
};

const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'cate',
  audience: `org:${user.orgId}` // Organization-specific
});
```

### Refresh Token

```javascript
const refreshToken = jwt.sign({
  sub: user.id,
  type: 'refresh'
}, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '7d',
  issuer: 'cate'
});
```

### Verificación

```javascript
const decoded = jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256'],
  issuer: 'cate'
});
```

## 🏢 Gestión de Organizaciones

### Crear Organización

```javascript
// Al registrar usuario
const org = await organizationService.createOrganization(
  `${name}'s Organization`,
  organization_slug
);

// Agregar usuario como admin
await organizationService.addUserToOrganization(userId, org.id, 'admin');
```

### Agregar Wallets

```javascript
// Vincular wallet a organización
await organizationService.addWalletToOrganization(
  orgId, 
  '0x1234...', 
  'Wallet Principal'
);
```

### Crear Facturas

```javascript
// Crear factura con referencia
const invoice = await organizationService.createInvoice(
  orgId,
  '0xabc123...', // bytes32 reference
  '1000000000000000000', // 1 ETH in wei
  '0x5678...', // expected sender (optional)
  24 // expires in hours
);
```

## 📡 Eventos por Organización

### Socket.IO Rooms

```javascript
// Al conectar socket
if (user.organization_id) {
  socket.join(`org:${user.organization_id}`);
  console.log(`🔗 Usuario conectado a organización ${user.organization_id}`);
}
```

### Emisión de Eventos

```javascript
// Determinar organización para evento
const orgId = await determineOrganizationForEvent(sender, receiver, reference);

if (orgId) {
  // Emitir solo a la organización
  io.to(`org:${orgId}`).emit('newPayment', transaction);
} else {
  // Emitir globalmente
  io.emit('newPayment', transaction);
}
```

### Determinación de Organización

```javascript
async function determineOrganizationForEvent(sender, receiver, reference) {
  // 1. Por receiver (destinatario)
  let org = await organizationService.getOrganizationByWallet(receiver);
  if (org) return org.id;

  // 2. Por sender (remitente)
  org = await organizationService.getOrganizationByWallet(sender);
  if (org) return org.id;

  // 3. Por reference (factura)
  if (reference) {
    org = await organizationService.getOrganizationByReference(reference);
    if (org) return org.id;
  }

  return null;
}
```

## 🔒 Privacidad de Datos

### Filtrado de Transacciones

```javascript
// Solo transacciones de la organización del usuario
const query = `
  SELECT * FROM transactions t
  WHERE (
    EXISTS (
      SELECT 1 FROM organization_wallets ow 
      WHERE ow.organization_id = $1 
      AND ow.address = LOWER(t.receiver)
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_wallets ow 
      WHERE ow.organization_id = $1 
      AND ow.address = LOWER(t.sender)
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_invoices oi 
      WHERE oi.organization_id = $1 
      AND oi.reference = t.reference
    )
  )
`;
```

### Control de Acceso

```javascript
// Verificar acceso a organización
const hasAccess = await organizationService.userHasAccess(
  userId, 
  orgId, 
  'viewer'
);

if (!hasAccess) {
  return res.status(403).json({ error: 'Acceso denegado' });
}
```

## 🛠️ Configuración

### Variables de Entorno

```env
# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cate_db
DB_USER=cate_user
DB_PASSWORD=secure_password

# Server
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

### Migración de Base de Datos

```bash
# Ejecutar esquema de multitenencia
psql -d your_database -f database/multitenancy_schema.sql

# Verificar tablas
psql -d your_database -c "\dt organizations*"
psql -d your_database -c "\dt organization_*"
```

## 🔄 Flujo de Autenticación

### 1. Login

```javascript
// POST /auth/login
const response = await axios.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// Response
{
  user: {
    id: 1,
    email: 'user@example.com',
    name: 'John Doe',
    role: 'admin',
    organization_id: 1,
    org_name: 'Example Corp',
    org_slug: 'example-corp'
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiresIn: 3600
}
```

### 2. Auto-refresh

```javascript
// Interceptor automático
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### 3. Socket Connection

```javascript
// Conectar con token
const socket = io(API_URL, {
  auth: { token: accessToken },
  withCredentials: true
});

// Automáticamente se une a la sala de la organización
socket.on('connect', () => {
  console.log('Conectado a organización:', user.organization_id);
});
```

## 📊 Roles y Permisos

### Jerarquía de Roles

```javascript
const roleHierarchy = {
  'admin': 3,   // Acceso completo
  'user': 2,    // Acceso limitado
  'viewer': 1   // Solo lectura
};

// Verificar acceso
const hasAccess = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
```

### Permisos por Rol

- **Admin**: Gestión completa de organización, wallets, facturas
- **User**: Ver transacciones, crear facturas
- **Viewer**: Solo lectura de transacciones

## 🚨 Seguridad

### Mejores Prácticas

1. **Tokens Cortos**: 1 hora de duración máxima
2. **Refresh Automático**: Renovación transparente
3. **Audience Binding**: Tokens vinculados a organizaciones
4. **Validación Estricta**: Verificación de issuer y algoritmo
5. **Aislamiento**: Eventos privados por organización

### Validación de Tokens

```javascript
// Verificar token con validaciones estrictas
const decoded = jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256'],  // Solo HS256
  issuer: 'cate',        // Issuer específico
  audience: `org:${orgId}` // Audience específico
});
```

## 🔍 Debugging

### Verificar Estado de Organización

```javascript
// Verificar organización de usuario
const user = await getUserWithOrganization(userId);
console.log('Usuario:', user.email);
console.log('Organización:', user.org_name);
console.log('Rol:', user.role);

// Verificar wallets de organización
const wallets = await organizationService.getOrganizationWallets(orgId);
console.log('Wallets:', wallets.map(w => w.address));

// Verificar facturas
const invoices = await organizationService.getOrganizationInvoices(orgId);
console.log('Facturas:', invoices.length);
```

### Logs de Eventos

```javascript
// Logs de conexión socket
console.log(`🔗 Usuario ${email} conectado a organización ${orgId}`);

// Logs de eventos blockchain
console.log(`📡 Evento emitido a organización ${orgId}: ${txHash}`);

// Logs de autenticación
console.log(`🔐 Token generado para usuario ${userId} en organización ${orgId}`);
```

## 📈 Próximos Pasos

1. **API Keys**: Autenticación por API key para organizaciones
2. **Webhooks**: Notificaciones HTTP para eventos críticos
3. **Auditoría**: Logs detallados de acceso y cambios
4. **Multi-org**: Usuarios en múltiples organizaciones
5. **SSO**: Integración con proveedores de identidad
6. **Rate Limiting**: Límites por organización
