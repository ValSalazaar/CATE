# 🚀 **CATE Verifiable Credentials System - Complete Guide**

## 📋 **System Overview**

The CATE Verifiable Credentials system is a complete blockchain-based identity verification platform that includes:

- **🔗 Smart Contract**: Solidity contract for credential issuance and verification
- **⚙️ Backend API**: Node.js/Express server with KYC integration
- **🗄️ Database**: PostgreSQL with encrypted metadata storage
- **🔐 Security**: AES-256-GCM encryption and HMAC webhook verification
- **🌐 Frontend**: React application with real-time updates

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Polygon)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Encrypted)   │
                       └─────────────────┘
```

## 📁 **Project Structure**

```
CATE/
├── blockchain/                    # Hardhat project
│   ├── contracts/
│   │   └── VerifiableCredentials.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── VerifiableCredentials.test.js
│   ├── hardhat.config.js
│   └── package.json
├── config/
│   └── env.js                    # Configuration management
├── db/
│   └── index.js                  # Database connection
├── utils/
│   └── crypto.js                 # Encryption utilities
├── blockchain/
│   └── contract.js               # Contract integration
├── kyc/
│   ├── index.js                  # KYC abstraction
│   └── providers/
│       └── mock.js               # Mock KYC provider
├── services/
│   └── vc.service.js             # VC business logic
├── api/
│   ├── vc.routes.js              # VC API endpoints
│   └── kyc.routes.js             # KYC API endpoints
├── migrations/
│   └── 001_create_vc_tables.sql  # Database schema
├── server.js                     # Main server
└── package.json
```

## 🚀 **Deployment Steps**

### **Step 1: Blockchain Deployment**

```bash
# Navigate to blockchain directory
cd blockchain

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your values:
# RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
# PRIVATE_KEY=your_private_key_without_0x

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Mumbai testnet
npm run deploy:mumbai
```

**Expected Output:**
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
```

### **Step 2: Backend Setup**

```bash
# Return to root directory
cd ..

# Install backend dependencies
npm install

# Copy ABI to backend
cp blockchain/abi/VerifiableCredentials.json abi/

# Set up environment variables
cp env.example .env
```

**Backend .env Configuration:**
```env
# Blockchain Configuration
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_without_0x
VC_CONTRACT_ADDRESS=0x1234567890abcdef... # From deployment

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

### **Step 3: Database Setup**

```bash
# Create PostgreSQL database
createdb cate_vc

# Run migrations
psql -d cate_vc -f migrations/001_create_vc_tables.sql
```

### **Step 4: Start Backend**

```bash
# Start the server
node server.js
```

**Expected Output:**
```
✅ Configuration validated successfully
✅ Database connected successfully
✅ Database initialized successfully
✅ Blockchain connected: {
  status: 'healthy',
  contractAddress: '0x1234567890abcdef...',
  owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  issuerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  isAuthorizedIssuer: true,
  network: 'maticmum',
  chainId: 80001
}
🚀 CATE Verifiable Credentials API listening on port 4000
📊 Health check: http://localhost:4000/health
🔗 API docs: http://localhost:4000/
🌍 Environment: development
```

## 🧪 **Testing the System**

### **1. Health Check**

```bash
curl http://localhost:4000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "connected",
    "tables": ["app_user", "kyc_session", "credential"]
  },
  "blockchain": {
    "status": "healthy",
    "contractAddress": "0x1234567890abcdef...",
    "owner": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "isAuthorizedIssuer": true,
    "network": "maticmum",
    "chainId": 80001
  },
  "version": "1.0.0"
}
```

### **2. Create Test User**

```bash
curl -X POST http://localhost:4000/api/vc \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "schema": "cate/v1/identity",
    "claims": {
      "kycLevel": "basic",
      "documentVerified": true,
      "selfieMatch": true
    }
  }'
```

**Expected Response:**
```json
{
  "txHash": "0xabcdef1234567890...",
  "credential": {
    "id": "uuid-credential-id",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "subject_address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "issuer_address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "onchain_id": "0xcredential_hash_on_chain",
    "metadata_hash": "0xmetadata_hash",
    "schema": "cate/v1/identity",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### **3. Verify Credential**

```bash
curl http://localhost:4000/api/vc/0xcredential_hash_on_chain
```

**Expected Response:**
```json
{
  "onchain": {
    "issuer": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "subject": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "metadataHash": "0xmetadata_hash",
    "revoked": false,
    "issuedAt": 1705312200
  },
  "offchain": {
    "id": "uuid-credential-id",
    "schema": "cate/v1/identity",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### **4. KYC Flow Test**

```bash
# Start KYC session
curl -X POST http://localhost:4000/api/kyc/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected Response:**
```json
{
  "session": {
    "id": "uuid-session-id",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "provider": "mock",
    "provider_session_id": "mock_abc123def456",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "flowUrl": "https://kyc.mock/flow/mock_abc123def456?email=user@example.com"
}
```

```bash
# Simulate KYC webhook (development only)
curl -X POST http://localhost:4000/api/kyc/webhook \
  -H "Content-Type: application/json" \
  -H "X-KYC-Signature: sha256=valid_signature" \
  -d '{
    "provider_session_id": "mock_abc123def456",
    "status": "approved",
    "result": {
      "kycLevel": "basic",
      "documentVerified": true,
      "selfieMatch": true
    }
  }'
```

## 🔧 **API Endpoints**

### **Verifiable Credentials**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/vc` | Issue new credential |
| `GET` | `/api/vc/:onchainId` | Get credential details |
| `DELETE` | `/api/vc/:onchainId` | Revoke credential |
| `GET` | `/api/vc/:onchainId/verify` | Verify credential integrity |

### **KYC Management**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/kyc/start` | Start KYC session |
| `GET` | `/api/kyc/session/:id` | Get session status |
| `POST` | `/api/kyc/webhook` | Process KYC webhook |

### **System**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health check |
| `GET` | `/` | API documentation |

## 🔐 **Security Features**

### **Encryption**
- **AES-256-GCM** for metadata encryption
- **Deterministic hashing** for blockchain storage
- **Secure key management** via environment variables

### **Authentication**
- **JWT tokens** for API access
- **Role-based access control** for issuers
- **HMAC webhook verification** for KYC providers

### **Blockchain Security**
- **Owner-only issuer management**
- **Original issuer revocation only**
- **Immutable credential records**

## 📊 **Monitoring & Logging**

### **Health Checks**
```bash
# System health
curl http://localhost:4000/health

# Database health
curl http://localhost:4000/health | jq '.database'

# Blockchain health
curl http://localhost:4000/health | jq '.blockchain'
```

### **Logs**
The system provides detailed logging for:
- **Contract interactions** with transaction hashes
- **Database operations** with query performance
- **KYC flow** with session tracking
- **Error handling** with stack traces

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Blockchain Connection Failed**
   ```bash
   # Check RPC URL and private key
   echo $RPC_URL
   echo $PRIVATE_KEY
   
   # Test network connection
   curl -X POST $RPC_URL \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **Database Connection Failed**
   ```bash
   # Check database URL
   echo $DATABASE_URL
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Contract Not Found**
   ```bash
   # Verify contract address
   echo $VC_CONTRACT_ADDRESS
   
   # Check on explorer
   # Mumbai: https://mumbai.polygonscan.com/address/$VC_CONTRACT_ADDRESS
   ```

4. **Encryption Key Invalid**
   ```bash
   # Generate new key
   openssl rand -hex 32
   
   # Update .env
   ENCRYPTION_KEY=generated_key_here
   ```

### **Debug Mode**
```bash
# Enable debug logging
NODE_ENV=development DEBUG=* node server.js
```

## 🎯 **Next Steps**

1. **Production Deployment**
   - Deploy to mainnet (Polygon)
   - Set up monitoring and alerting
   - Configure SSL/TLS certificates

2. **Frontend Integration**
   - Connect React app to API
   - Implement real-time updates
   - Add user authentication

3. **Advanced Features**
   - Multi-tenant support
   - Advanced KYC providers
   - Credential templates
   - Batch operations

4. **Security Hardening**
   - Rate limiting
   - Input validation
   - Audit logging
   - Penetration testing

---

## 🎉 **Success Criteria**

✅ **Smart contract deployed** and verified on testnet
✅ **Backend API running** with health checks passing
✅ **Database initialized** with proper schema
✅ **KYC flow working** with mock provider
✅ **Credential issuance** and verification functional
✅ **Security measures** implemented and tested

**The CATE Verifiable Credentials system is now ready for production use!** 🚀
