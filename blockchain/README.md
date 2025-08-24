# CATE Blockchain - Verifiable Credentials

## 🎯 **Configuración Hardhat para Verifiable Credentials**

### **📁 Estructura del Proyecto**
```
/blockchain
├── contracts/
│   └── VerifiableCredentials.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── VerifiableCredentials.test.js
├── abi/
│   └── VerifiableCredentials.json (generado)
├── deployments/
│   └── verifiable-credentials-*.json (generado)
├── hardhat.config.js
├── package.json
├── env.example
└── README.md
```

## 🚀 **Instalación y Configuración**

### **1. Instalar Dependencias**
```bash
cd blockchain
npm install
```

### **2. Configurar Variables de Entorno**
```bash
# Copiar template
cp env.example .env

# Editar .env con tus valores
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### **3. Compilar Contratos**
```bash
npm run compile
```

## 🧪 **Testing**

### **Ejecutar Tests**
```bash
npm test
```

### **Tests Incluidos**
- ✅ **Deployment**: Verificación de owner y autorización inicial
- ✅ **Gestión de Emisores**: Agregar/remover emisores autorizados
- ✅ **Emisión de Credenciales**: Crear credenciales con hash de metadatos
- ✅ **Verificación**: Consultar y validar credenciales
- ✅ **Revocación**: Revocar credenciales por emisor original
- ✅ **Ownership**: Transferencia de propiedad del contrato

## 🚀 **Deployment**

### **Redes Disponibles**
- **Mumbai** (Polygon Testnet): `npm run deploy:mumbai`
- **Goerli** (Ethereum Testnet): `npm run deploy:goerli`
- **Sepolia** (Ethereum Testnet): `npm run deploy:sepolia`
- **Local** (Hardhat Network): `npm run deploy:local`

### **Deploy a Mumbai (Recomendado)**
```bash
npm run deploy:mumbai
```

### **Salida del Deployment**
```
🚀 Desplegando VerifiableCredentials...
📝 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
💰 Balance: 0.5 ETH
✅ VerifiableCredentials desplegado en: 0x1234567890abcdef...
🔐 Deployer autorizado: true
👑 Owner del contrato: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
📦 ABI + address guardados en /abi/VerifiableCredentials.json

📋 Variables para .env:
VC_CONTRACT_ADDRESS=0x1234567890abcdef...
VC_DEPLOYER_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
VC_OWNER_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6

🎉 ¡Deployment completado exitosamente!
📁 Información guardada en deployments/
🔗 Contrato verificado y listo para usar
```

## 📋 **Archivos Generados**

### **1. ABI y Address (/abi/VerifiableCredentials.json)**
```json
{
  "contract": "VerifiableCredentials",
  "address": "0x1234567890abcdef...",
  "deployer": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "owner": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "network": "mumbai",
  "chainId": 80001,
  "timestamp": "2024-01-15T10:30:00Z",
  "abi": [...]
}
```

### **2. Deployment Record (/deployments/verifiable-credentials-*.json)**
Archivo con información completa del deployment para auditoría.

## 🔧 **Scripts Disponibles**

### **Compilación y Testing**
```bash
npm run compile          # Compilar contratos
npm test                 # Ejecutar tests
npm run clean            # Limpiar cache y artifacts
```

### **Deployment**
```bash
npm run deploy:mumbai    # Deploy a Polygon Mumbai
npm run deploy:goerli    # Deploy a Ethereum Goerli
npm run deploy:sepolia   # Deploy a Ethereum Sepolia
npm run deploy:local     # Deploy a Hardhat Network
```

### **Verificación de Contratos**
```bash
npm run verify:mumbai    # Verificar en Polygonscan
npm run verify:goerli    # Verificar en Etherscan
npm run verify:sepolia   # Verificar en Etherscan
```

### **Análisis**
```bash
npm run gas              # Reporte de gas
npm run coverage         # Cobertura de tests
npm run node             # Iniciar nodo local
```

## 🔗 **Integración con Backend**

### **1. Copiar ABI al Backend**
```bash
# Desde la raíz del proyecto
cp blockchain/abi/VerifiableCredentials.json abi/
```

### **2. Actualizar Variables de Entorno del Backend**
```env
# Blockchain Configuration
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
VC_CONTRACT_ADDRESS=0x1234567890abcdef... # Del deployment

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cate_vc

# Security
ENCRYPTION_KEY=64_character_hex_string_for_aes_256_gcm
KYC_WEBHOOK_SECRET=your_webhook_secret_for_hmac

# KYC Provider
KYC_PROVIDER=mock

# Server
PORT=4000
CORS_ORIGIN=*
NODE_ENV=development
```

### **3. Probar Endpoints**
```bash
# Health check
curl http://localhost:4000/health

# Emitir credencial
curl -X POST http://localhost:4000/api/vc \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-del-usuario",
    "schema": "cate/v1/identity",
    "claims": { "kycLevel": "basic" }
  }'

# Consultar credencial
curl http://localhost:4000/api/vc/0xID_ONCHAIN

# Verificar integridad
curl http://localhost:4000/api/vc/0xID_ONCHAIN/verify
```

## 🔒 **Seguridad**

### **Variables Sensibles**
- **PRIVATE_KEY**: Nunca compartir o commitear
- **API Keys**: Mantener seguras para verificación
- **RPC URLs**: Usar variables de entorno

### **Buenas Prácticas**
- ✅ Usar testnets para desarrollo
- ✅ Verificar contratos en explorers
- ✅ Mantener backups de deployments
- ✅ Documentar cambios en contratos

## 📊 **Monitoreo**

### **Gas Usage**
```bash
npm run gas
```

### **Test Coverage**
```bash
npm run coverage
```

### **Contract Verification**
- **Mumbai**: https://mumbai.polygonscan.com/address/0x...
- **Goerli**: https://goerli.etherscan.io/address/0x...
- **Sepolia**: https://sepolia.etherscan.io/address/0x...

## 🚨 **Troubleshooting**

### **Error: "Not owner"**
- Verificar que estás usando la cuenta correcta
- Confirmar que la cuenta es el owner del contrato

### **Error: "Issuer not authorized"**
- Agregar la cuenta como emisor autorizado
- Verificar que el owner ejecute `addIssuer()`

### **Error: "Insufficient funds"**
- Verificar balance en la red seleccionada
- Obtener tokens de testnet si es necesario

### **Error: "Network not found"**
- Verificar configuración de red en hardhat.config.js
- Confirmar que RPC_URL es correcto

## 🎯 **Próximos Pasos**

### **Después del Deployment**
1. **Verificar contrato** en el explorer correspondiente
2. **Configurar backend** con las nuevas variables
3. **Probar endpoints** de la API
4. **Monitorear** transacciones y eventos

### **Producción**
1. **Deploy a mainnet** (Polygon/Ethereum)
2. **Configurar monitoreo** de eventos
3. **Implementar backup** de contratos
4. **Documentar** procedimientos de emergencia

---

¡El sistema de Verifiable Credentials está listo para usar! 🚀
