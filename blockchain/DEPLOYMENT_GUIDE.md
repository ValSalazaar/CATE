# 🚀 **CATE Blockchain - Deployment Guide**

## ✅ **Setup Completado**

El entorno de desarrollo blockchain está completamente configurado y listo para usar:

- ✅ **Hardhat configurado** con CommonJS
- ✅ **Smart contract compilado** exitosamente
- ✅ **Tests pasando** (15/15 tests)
- ✅ **Scripts de deployment** funcionales
- ✅ **Configuración de redes** (Mumbai, Goerli, Sepolia)

## 🔧 **Configuración Requerida**

### **1. Variables de Entorno**
Crea un archivo `.env` en `/blockchain/` con:

```env
# RPC URL (elige una red)
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID

# Private Key (sin 0x)
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# API Keys para verificación (opcional)
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Gas Reporter
REPORT_GAS=true
```

### **2. Obtener Test Tokens**

#### **Para Mumbai (Polygon Testnet)**
- **Faucet**: https://faucet.polygon.technology/
- **Explorer**: https://mumbai.polygonscan.com/

#### **Para Goerli (Ethereum Testnet)**
- **Faucet**: https://goerlifaucet.com/
- **Explorer**: https://goerli.etherscan.io/

#### **Para Sepolia (Ethereum Testnet)**
- **Faucet**: https://sepoliafaucet.com/
- **Explorer**: https://sepolia.etherscan.io/

## 🚀 **Deployment**

### **Opción 1: Mumbai (Recomendado)**
```bash
npm run deploy:mumbai
```

### **Opción 2: Goerli**
```bash
npm run deploy:goerli
```

### **Opción 3: Sepolia**
```bash
npm run deploy:sepolia
```

## 📋 **Después del Deployment**

### **1. Salida Esperada**
```
🚀 Desplegando VerifiableCredentials...
📝 Deployer: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
💰 Balance: 0.5 ETH
✅ VerifiableCredentials desplegado en: 0x1234567890abcdef...
🔐 Deployer autorizado: true
👑 Owner del contrato: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
📦 ABI + address → /blockchain/abi/VerifiableCredentials.json

📋 Variables para .env:
VC_CONTRACT_ADDRESS=0x1234567890abcdef...
VC_DEPLOYER_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
VC_OWNER_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6

🎉 ¡Deployment completado exitosamente!
```

### **2. Archivos Generados**
- **`/blockchain/abi/VerifiableCredentials.json`**: ABI y dirección del contrato
- **`/blockchain/deployments/verifiable-credentials-*.json`**: Registro completo del deployment

### **3. Copiar ABI al Backend**
```bash
# Desde la raíz del proyecto
cp blockchain/abi/VerifiableCredentials.json abi/
```

### **4. Actualizar .env del Backend**
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

## 🧪 **Testing y Verificación**

### **1. Compilar Contrato**
```bash
npm run compile
```

### **2. Ejecutar Tests**
```bash
npm test
```

### **3. Verificar en Explorer**
Una vez desplegado, puedes verificar el contrato en:
- **Mumbai**: https://mumbai.polygonscan.com/address/0x...
- **Goerli**: https://goerli.etherscan.io/address/0x...
- **Sepolia**: https://sepolia.etherscan.io/address/0x...

## 🔗 **Integración con Backend**

### **1. Iniciar Backend**
```bash
cd ..
node server.js
```

### **2. Health Check**
```bash
curl http://localhost:4000/health
```

### **3. Probar Endpoints VC**

#### **Emitir Credencial**
```bash
curl -X POST http://localhost:4000/api/vc \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-del-usuario",
    "schema": "cate/v1/identity",
    "claims": { "kycLevel": "basic" }
  }'
```

#### **Consultar Credencial**
```bash
curl http://localhost:4000/api/vc/0xID_ONCHAIN
```

#### **Verificar Integridad**
```bash
curl http://localhost:4000/api/vc/0xID_ONCHAIN/verify
```

#### **Revocar Credencial**
```bash
curl -X DELETE http://localhost:4000/api/vc/0xID_ONCHAIN
```

## 🛠️ **Comandos Útiles**

### **Desarrollo**
```bash
npm run compile          # Compilar contratos
npm test                 # Ejecutar tests
npm run clean            # Limpiar cache
npm run gas              # Reporte de gas
```

### **Deployment**
```bash
npm run deploy:mumbai    # Deploy a Mumbai
npm run deploy:goerli    # Deploy a Goerli  
npm run deploy:sepolia   # Deploy a Sepolia
```

### **Local Development**
```bash
npm run node             # Iniciar nodo local
npm run deploy:local     # Deploy a nodo local
```

## ⚠️ **Importante**

1. **Nunca commitear** archivos `.env` con claves privadas reales
2. **Usar testnets** para desarrollo y pruebas
3. **Verificar balance** antes de hacer deployment
4. **Guardar direcciones** del contrato desplegado
5. **Verificar contrato** en el explorer correspondiente

## 🎯 **Próximos Pasos**

1. **Configurar variables** de entorno
2. **Obtener test tokens** del faucet
3. **Desplegar contrato** en testnet
4. **Configurar backend** con nueva dirección
5. **Probar endpoints** de la API
6. **Verificar funcionamiento** completo

---

¡El sistema blockchain está listo para deployment! 🚀
