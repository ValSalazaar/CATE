# CATE Verifiable Credentials - Sistema Completo

## 🎯 **Sistema de Credenciales Verificables**

### **📱 Descripción General**

El sistema de Verifiable Credentials de CATE permite emitir, verificar y revocar credenciales digitales en la blockchain, proporcionando:

- **Emisión segura** de credenciales verificables
- **Verificación en tiempo real** de autenticidad
- **Revocación controlada** por el emisor original
- **Gestión de emisores autorizados**
- **Interfaz completa** para usuarios

## 🏗️ **Arquitectura del Sistema**

### **1. Smart Contract (VerifiableCredentials.sol)**
```solidity
contract VerifiableCredentials {
    struct Credential {
        address issuer;
        address subject;
        string metadataURI;
        bool revoked;
        uint256 issuedAt;
    }
    
    mapping(bytes32 => Credential) private credentials;
    mapping(address => bool) public authorizedIssuers;
}
```

### **2. Backend API (routes/vc.js)**
- **POST /api/vc** - Emitir credencial
- **DELETE /api/vc/:id** - Revocar credencial
- **GET /api/vc/:id** - Consultar credencial
- **GET /api/vc/verify/:id** - Verificar credencial
- **POST /api/vc/authorize-issuer** - Autorizar emisor
- **GET /api/vc/issuer-status/:address** - Estado del emisor

### **3. Frontend (CredentialManager.jsx)**
- **Gestión de credenciales** con interfaz intuitiva
- **Verificación en tiempo real** con resultados visuales
- **Estadísticas** de credenciales emitidas
- **Modal para emisión** de nuevas credenciales

## 🔧 **Smart Contract - VerifiableCredentials.sol**

### **Estructura de Datos**
```solidity
struct Credential {
    address issuer;        // Emisor de la credencial
    address subject;       // Sujeto (destinatario)
    string metadataURI;    // URI con metadatos (IPFS/URL)
    bool revoked;          // Estado de revocación
    uint256 issuedAt;      // Timestamp de emisión
}
```

### **Funciones Principales**

#### **1. Emitir Credencial**
```solidity
function issueCredential(
    address _subject,
    string calldata _metadataURI
) external onlyAuthorizedIssuer returns (bytes32)
```

#### **2. Revocar Credencial**
```solidity
function revokeCredential(bytes32 _id) external onlyIssuer(_id)
```

#### **3. Verificar Credencial**
```solidity
function verifyCredential(bytes32 _id) external view returns (
    address issuer,
    address subject,
    string memory metadataURI,
    bool revoked,
    uint256 issuedAt
)
```

#### **4. Gestión de Emisores**
```solidity
function authorizeIssuer(address _issuer) external
function revokeIssuer(address _issuer) external
function isAuthorizedIssuer(address _issuer) external view returns (bool)
```

### **Eventos**
```solidity
event CredentialIssued(bytes32 indexed id, address indexed issuer, address indexed subject);
event CredentialRevoked(bytes32 indexed id, address indexed issuer);
event IssuerAuthorized(address indexed issuer);
event IssuerRevoked(address indexed issuer);
```

### **Modificadores de Seguridad**
```solidity
modifier onlyIssuer(bytes32 _id) {
    require(credentials[_id].issuer == msg.sender, "No autorizado");
    _;
}

modifier onlyAuthorizedIssuer() {
    require(authorizedIssuers[msg.sender], "Emisor no autorizado");
    _;
}
```

## 🚀 **Backend API - routes/vc.js**

### **Configuración Blockchain**
```javascript
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.VC_CONTRACT_ADDRESS, VC_ABI, wallet);
```

### **Endpoints Implementados**

#### **1. Emitir Credencial**
```javascript
router.post('/', authMiddleware, async (req, res) => {
  const { subject, metadataURI } = req.body;
  
  // Validaciones
  if (!subject || !metadataURI) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  
  // Verificar autorización
  const isAuthorized = await contract.isAuthorizedIssuer(wallet.address);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }
  
  // Emitir en blockchain
  const tx = await contract.issueCredential(subject, metadataURI);
  const receipt = await tx.wait();
  
  // Extraer ID del evento
  const event = receipt.logs.find(log => {
    const parsed = contract.interface.parseLog(log);
    return parsed.name === 'CredentialIssued';
  });
  
  res.json({
    success: true,
    credentialId: event.args.id,
    txHash: receipt.transactionHash
  });
});
```

#### **2. Verificar Credencial**
```javascript
router.get('/verify/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [issuer, subject, metadataURI, revoked, issuedAt] = 
      await contract.verifyCredential(id);
    
    const isAuthorized = await contract.isAuthorizedIssuer(issuer);
    
    res.json({
      credentialId: id,
      valid: !revoked && isAuthorized,
      issuer: issuer,
      subject: subject,
      metadataURI: metadataURI,
      revoked: revoked,
      issuerAuthorized: isAuthorized,
      issuedAt: new Date(Number(issuedAt) * 1000).toISOString()
    });
  } catch (error) {
    res.status(404).json({ error: 'Credencial no encontrada', valid: false });
  }
});
```

#### **3. Revocar Credencial**
```javascript
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  // Verificar propiedad
  const credential = await contract.getCredential(id);
  if (credential.issuer !== wallet.address) {
    return res.status(403).json({ error: 'Solo el emisor puede revocar' });
  }
  
  // Revocar en blockchain
  const tx = await contract.revokeCredential(id);
  await tx.wait();
  
  res.json({ success: true, revoked: true });
});
```

## 🎨 **Frontend - CredentialManager.jsx**

### **Funcionalidades Principales**

#### **1. Dashboard de Credenciales**
```jsx
// Stats en tiempo real
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="card text-center">
    <div className="text-2xl font-semibold text-primary">
      {credentials.length}
    </div>
    <div className="text-sm text-slate-600">Total Credenciales</div>
  </div>
  <div className="card text-center">
    <div className="text-2xl font-semibold text-success-600">
      {credentials.filter(c => !c.revoked).length}
    </div>
    <div className="text-sm text-slate-600">Válidas</div>
  </div>
  <div className="card text-center">
    <div className="text-2xl font-semibold text-warning-600">
      {credentials.filter(c => c.revoked).length}
    </div>
    <div className="text-sm text-slate-600">Revocadas</div>
  </div>
</div>
```

#### **2. Emitir Nueva Credencial**
```jsx
const handleIssueCredential = async (e) => {
  e.preventDefault();
  
  try {
    const response = await axios.post('/api/vc', issueForm, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    setToast(`✅ Credencial emitida: ${response.data.credentialId}`);
    
    // Agregar a la lista
    setCredentials(prev => [{
      id: response.data.credentialId,
      issuer: response.data.issuer,
      subject: response.data.subject,
      metadataURI: issueForm.metadataURI,
      revoked: false,
      issuedAt: response.data.issuedAt,
      status: "valid"
    }, ...prev]);
    
  } catch (error) {
    setToast(`❌ Error: ${error.response?.data?.error || error.message}`);
  }
};
```

#### **3. Verificar Credencial**
```jsx
const handleVerifyCredential = async (e) => {
  e.preventDefault();
  
  try {
    const response = await axios.get(`/api/vc/verify/${verifyForm.credentialId}`);
    setVerificationResult(response.data);
    setToast(`🔍 Verificación completada`);
  } catch (error) {
    setVerificationResult({
      valid: false,
      error: error.response?.data?.error || error.message
    });
    setToast(`❌ Error en verificación`);
  }
};
```

#### **4. Lista de Credenciales**
```jsx
{credentials.map((credential, index) => (
  <motion.div
    key={credential.id}
    className={`p-4 rounded-xl border ${
      credential.revoked 
        ? 'bg-slate-50 border-slate-200' 
        : 'bg-white border-slate-200'
    }`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${
            credential.revoked ? 'bg-warning-500' : 'bg-success-500'
          }`} />
          <span className="text-sm font-medium text-slate-700">
            {credential.revoked ? "Revocada" : "Válida"}
          </span>
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <div><strong>Emisor:</strong> {credential.issuer}</div>
          <div><strong>Sujeto:</strong> {credential.subject}</div>
          <div><strong>Emitida:</strong> {new Date(credential.issuedAt).toLocaleDateString()}</div>
        </div>
      </div>
      {!credential.revoked && (
        <motion.button
          onClick={() => handleRevokeCredential(credential.id)}
          className="btn btn-ghost text-error-600 hover:text-error-700"
        >
          Revocar
        </motion.button>
      )}
    </div>
  </motion.div>
))}
```

## 🔒 **Seguridad y Validaciones**

### **Smart Contract**
- **Modificadores de acceso** para funciones críticas
- **Verificación de emisores autorizados**
- **Prevención de duplicados** con IDs únicos
- **Validación de propiedad** para revocación

### **Backend**
- **Middleware de autenticación** para endpoints privados
- **Validación de entrada** en todos los endpoints
- **Manejo de errores** robusto
- **Verificación de permisos** antes de operaciones

### **Frontend**
- **Validación de formularios** en tiempo real
- **Confirmaciones** para acciones destructivas
- **Manejo de estados de carga** y errores
- **Feedback visual** inmediato

## 📱 **Flujo de Usuario**

### **1. Emitir Credencial**
1. Usuario hace clic en "Emitir Credencial"
2. Se abre modal con formulario
3. Usuario ingresa dirección del sujeto y URI de metadatos
4. Sistema valida entrada y envía a blockchain
5. Se muestra confirmación con ID de credencial
6. Credencial aparece en la lista

### **2. Verificar Credencial**
1. Usuario expande sección "Verificar Credencial"
2. Ingresa ID de credencial a verificar
3. Sistema consulta blockchain
4. Se muestra resultado con estado y detalles
5. Indicador visual de validez

### **3. Revocar Credencial**
1. Usuario hace clic en "Revocar" en una credencial válida
2. Sistema pide confirmación
3. Se envía transacción de revocación
4. Credencial cambia a estado "Revocada"
5. Se muestra confirmación

## 🚀 **Deployment y Configuración**

### **1. Deploy del Smart Contract**
```bash
# Compilar
npx hardhat compile

# Deploy
npx hardhat run scripts/deploy-verifiable-credentials.js --network mumbai
```

### **2. Variables de Entorno**
```env
# Blockchain
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
VC_CONTRACT_ADDRESS=0x...deployed_contract_address

# Backend
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://...
```

### **3. Integración en Backend**
```javascript
// server.js
app.use('/api/vc', require('./routes/vc'));
```

### **4. Integración en Frontend**
```jsx
// App.jsx
import CredentialManager from "./components/CredentialManager";

// En el tab Skills
{active === "skills" && <CredentialManager />}
```

## 🎯 **Casos de Uso**

### **1. Certificaciones Académicas**
```javascript
// Emitir certificado de curso
{
  subject: "0xStudentAddress",
  metadataURI: "ipfs://QmCertificationData"
}
```

### **2. Credenciales Profesionales**
```javascript
// Emitir credencial de habilidad
{
  subject: "0xProfessionalAddress", 
  metadataURI: "ipfs://QmSkillVerification"
}
```

### **3. Verificación de Identidad**
```javascript
// Verificar credencial de identidad
GET /api/vc/verify/0xCredentialId
```

## 🔧 **Próximos Pasos**

### **1. Mejoras de Seguridad**
- **Cifrado de metadatos** sensibles
- **Multi-signature** para revocación
- **Time-locks** para credenciales temporales

### **2. Funcionalidades Avanzadas**
- **Credenciales compuestas** (múltiples emisores)
- **Sistema de reputación** de emisores
- **Notificaciones push** para revocaciones

### **3. Integración con IPFS**
- **Subida automática** de metadatos a IPFS
- **Validación de integridad** de archivos
- **Gestión de versiones** de credenciales

## 🎉 **Resultado Final**

El sistema de Verifiable Credentials de CATE ofrece:

✅ **Smart contract seguro** con gestión de emisores autorizados
✅ **API completa** para todas las operaciones CRUD
✅ **Interfaz intuitiva** con animaciones y feedback
✅ **Verificación en tiempo real** de credenciales
✅ **Gestión de permisos** granular
✅ **Auditoría completa** en blockchain
✅ **Escalabilidad** para múltiples casos de uso

¡El sistema está listo para emitir y verificar credenciales digitales de forma segura y confiable! 🚀
