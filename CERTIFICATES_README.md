# CATE - Blockchain Certificate System

Sistema completo de emisión y verificación de certificados basado en blockchain con integración de smart contracts, base de datos y API REST.

## 🏗️ Arquitectura del Sistema

### **1. Smart Contract (Solidity)**
- **Contrato**: `CateCertificates.sol`
- **Red**: Polygon (Ethereum compatible)
- **Funcionalidades**:
  - Registro de hashes de certificados
  - Verificación de autenticidad
  - Gestión de emisores autorizados
  - Eventos para auditoría

### **2. Backend (Node.js + Express)**
- **Servicio**: `services/certificates.js`
- **API Routes**: `routes/certificates.js`
- **Base de Datos**: PostgreSQL
- **Funcionalidades**:
  - Emisión de certificados
  - Verificación dual (blockchain + DB)
  - Gestión de archivos .catecert
  - Logs de verificación

### **3. Frontend (React)**
- **Componente**: `CertificateManager.jsx`
- **Funcionalidades**:
  - Formulario de emisión
  - Verificación por archivo o hash
  - Descarga automática de certificados
  - Interfaz moderna y responsive

## 🔐 Flujo de Emisión

### **1. Generación de Hash**
```javascript
// Generar SHA-256 hash del certificado
const certString = JSON.stringify(certData, Object.keys(certData).sort());
const certHash = crypto.createHash('sha256').update(certString).digest('hex');
```

### **2. Registro en Blockchain**
```javascript
// Conectar al smart contract
const contract = new ethers.Contract(contractAddress, abi, wallet);
const tx = await contract.registerCertificate(`0x${certHash}`, metadata);
```

### **3. Almacenamiento en Base de Datos**
```sql
INSERT INTO certificates (hash, issuer_id, organization_id, tx_hash, block_number, cert_data, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

### **4. Generación de Archivo .catecert**
```json
{
  "version": "1.0",
  "data": { /* datos del certificado */ },
  "signature": "hash_sha256",
  "issuer": {
    "name": "Universidad XYZ",
    "wallet": "0x...",
    "organization": "org_id"
  },
  "blockchain": {
    "network": "Polygon",
    "txHash": "0x...",
    "blockNumber": 12345,
    "contractAddress": "0x..."
  },
  "metadata": { /* metadatos adicionales */ },
  "issuedAt": "2024-01-15T10:30:00Z"
}
```

## 🔍 Flujo de Verificación

### **1. Verificación de Hash**
```javascript
// Calcular hash del contenido
const calculatedHash = generateCertificateHash(certificateFile.data);
if (calculatedHash !== certificateFile.signature) {
  return { isValid: false, message: 'Certificate data has been altered' };
}
```

### **2. Verificación en Blockchain**
```javascript
// Consultar smart contract
const [isValid, issuer, timestamp] = await contract.verifyCertificate(`0x${hash}`);
```

### **3. Verificación en Base de Datos**
```sql
SELECT * FROM verify_certificate_integrity($1);
-- Verifica: existencia, estado del emisor, estado del certificado
```

### **4. Log de Verificación**
```sql
INSERT INTO certificate_verifications (certificate_id, verifier_ip, verification_result, verification_details)
VALUES ($1, $2, $3, $4);
```

## 📊 Base de Datos

### **Tablas Principales**

#### **issuers**
```sql
CREATE TABLE issuers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **certificates**
```sql
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) UNIQUE NOT NULL,
    issuer_id INTEGER NOT NULL REFERENCES issuers(id),
    organization_id INTEGER REFERENCES organizations(id),
    tx_hash VARCHAR(66),
    block_number INTEGER,
    metadata JSONB DEFAULT '{}',
    cert_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **certificate_verifications**
```sql
CREATE TABLE certificate_verifications (
    id SERIAL PRIMARY KEY,
    certificate_id INTEGER REFERENCES certificates(id),
    verifier_ip INET,
    verification_result VARCHAR(20) NOT NULL,
    verification_details JSONB DEFAULT '{}',
    verified_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Funciones SQL**
- `get_certificate_with_issuer(hash)` - Obtener certificado con detalles del emisor
- `get_certificates_by_organization(org_id)` - Certificados por organización
- `get_issuer_stats(wallet)` - Estadísticas del emisor
- `verify_certificate_integrity(hash)` - Verificación completa de integridad

## 🚀 API Endpoints

### **Emisión de Certificados**
```bash
POST /certificates/issue
Authorization: Bearer <token>
Content-Type: application/json

{
  "certData": {
    "recipient": { "name": "John Doe", "email": "john@example.com" },
    "certificate": { "title": "Bachelor Degree", "type": "academic" },
    "issuer": { "name": "University XYZ" }
  },
  "metadata": { "issuedBy": "admin@university.edu" }
}
```

### **Verificación por Archivo**
```bash
POST /certificates/verify
Content-Type: multipart/form-data

certificate: <file.catecert>
```

### **Verificación por Hash**
```bash
GET /certificates/verify/{hash}
```

### **Descarga de Certificado**
```bash
GET /certificates/{id}/download
Authorization: Bearer <token>
```

### **Certificados por Organización**
```bash
GET /certificates/organization/{orgId}
Authorization: Bearer <token>
```

### **Estadísticas**
```bash
GET /certificates/stats/contract
GET /certificates/stats/issuer/{wallet}
```

## 🛠️ Configuración

### **Variables de Entorno**
```env
# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
CATE_CERT_CONTRACT_ADDRESS=0x...
ISSUER_PRIVATE_KEY=your_private_key_here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cate

# JWT
JWT_SECRET=your_jwt_secret
```

### **Deployment del Smart Contract**
```bash
# Compilar
npx hardhat compile

# Deploy
npx hardhat run scripts/deploy-certificates.js --network polygon

# Verificar en Polygonscan
npx hardhat verify --network polygon 0xCONTRACT_ADDRESS
```

## 📱 Uso del Frontend

### **Emisión de Certificado**
1. Navegar a la pestaña "Issue Certificate"
2. Completar información del destinatario
3. Configurar detalles del certificado
4. Hacer clic en "Issue Certificate"
5. El archivo .catecert se descarga automáticamente

### **Verificación de Certificado**
1. Navegar a la pestaña "Verify Certificate"
2. Elegir método: archivo o hash
3. Subir archivo .catecert o ingresar hash
4. Hacer clic en "Verify Certificate"
5. Revisar resultado de verificación

## 🔒 Seguridad

### **Autenticación**
- JWT tokens para API
- Verificación de roles (issuer, viewer)
- Acceso por organización

### **Integridad**
- Hash SHA-256 para verificación
- Doble verificación (blockchain + DB)
- Logs de todas las verificaciones

### **Autorización**
- Solo emisores autorizados pueden registrar
- Verificación de estado del emisor
- Control de acceso por organización

## 📈 Monitoreo y Analytics

### **Métricas Disponibles**
- Total de certificados emitidos
- Total de emisores autorizados
- Estadísticas por emisor
- Logs de verificación

### **Eventos de Blockchain**
```javascript
// Escuchar eventos de registro
contract.on("CertificateRegistered", (certHash, issuer, timestamp, metadata) => {
  console.log(`Certificate registered: ${certHash} by ${issuer}`);
});
```

## 🧪 Testing

### **Test de Emisión**
```bash
curl -X POST http://localhost:4000/certificates/issue \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "certData": {
      "recipient": {"name": "Test User", "email": "test@example.com"},
      "certificate": {"title": "Test Certificate", "type": "test"}
    }
  }'
```

### **Test de Verificación**
```bash
curl -X POST http://localhost:4000/certificates/verify \
  -F "certificate=@test-certificate.catecert"
```

## 🔄 Integración con CATE

### **Socket.IO Events**
```javascript
// Emitir evento de nuevo certificado
io.to(`org:${orgId}`).emit('certificate:issued', {
  certificateId: certId,
  hash: certHash,
  issuer: issuerName
});
```

### **Organización Multitenancy**
- Certificados aislados por organización
- Emisores vinculados a organizaciones
- Acceso controlado por roles

## 📋 Próximos Pasos

1. **Implementar revocación de certificados**
2. **Añadir soporte para múltiples redes blockchain**
3. **Integrar con sistemas de identidad descentralizada**
4. **Implementar templates de certificados**
5. **Añadir soporte para certificados con expiración**
6. **Implementar batch issuance**
7. **Añadir analytics avanzados**
8. **Integrar con sistemas de verificación externos**

## 🆘 Troubleshooting

### **Error: "Issuer not authorized"**
- Verificar que el emisor esté registrado en el smart contract
- Confirmar que el wallet esté activo en la base de datos

### **Error: "Certificate already exists"**
- El hash del certificado ya está registrado
- Verificar que los datos sean únicos

### **Error: "Blockchain verification failed"**
- Verificar conexión a la red Polygon
- Confirmar que el contrato esté desplegado correctamente

### **Error: "Database verification failed"**
- Verificar conexión a PostgreSQL
- Confirmar que las tablas estén creadas correctamente
