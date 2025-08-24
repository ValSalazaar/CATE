# CATE Payments Smart Contract

Contrato inteligente para el sistema de pagos de CATE usando stablecoins (USDC).

## Estructura del Proyecto

```
contracts/
├── CatePayments.sol      # Contrato principal de pagos
└── MockERC20.sol         # Token mock para testing

scripts/
└── deploy.js             # Script de deployment

test/
└── CatePayments.test.js  # Tests del contrato

hooks/
└── useCatePayments.js    # Hook React para interactuar con el contrato

components/
└── PaymentInterface.jsx  # Componente React para la interfaz de pagos
```

## Funcionalidades del Contrato

### CatePayments.sol
- **Constructor**: Inicializa el contrato con la dirección del stablecoin
- **sendPayment**: Envía pagos usando stablecoins
- **Eventos**: `PaymentSent` para tracking de transacciones
- **Seguridad**: Usa `transferFrom` para evitar problemas de reentrancy

## Desarrollo Local

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Compilar Contratos
```bash
npx hardhat compile
```

### 3. Ejecutar Tests
```bash
npx hardhat test
```

### 4. Deploy Local
```bash
# Iniciar nodo local
npx hardhat node

# En otra terminal, deploy
npx hardhat run scripts/deploy.js --network localhost
```

## Deployment

### Variables de Entorno
Agrega estas variables a tu `.env`:
```env
PRIVATE_KEY=tu_clave_privada
SEPOLIA_URL=https://sepolia.infura.io/v3/tu_proyecto_id
POLYGON_URL=https://polygon-rpc.com
ETHERSCAN_API_KEY=tu_api_key_de_etherscan
```

### Deploy en Testnet (Sepolia)
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Deploy en Mainnet
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### Verificar en Etherscan
```bash
npx hardhat verify --network sepolia DIRECCION_DEL_CONTRATO DIRECCION_DEL_STABLECOIN
```

## Uso en React

### Hook useCatePayments
```javascript
import useCatePayments from './hooks/useCatePayments';

function MyComponent() {
  const { 
    sendPayment, 
    getBalance, 
    isLoading, 
    error 
  } = useCatePayments(contractAddress);

  const handlePayment = async () => {
    try {
      await sendPayment(recipientAddress, amount);
      console.log('Payment sent!');
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };
}
```

### Componente PaymentInterface
```javascript
import PaymentInterface from './components/PaymentInterface';

function App() {
  return (
    <PaymentInterface 
      contractAddress="0x..." 
    />
  );
}
```

## Direcciones de Stablecoins

### USDC
- **Ethereum Mainnet**: `0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C`
- **Polygon**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### USDT
- **Ethereum Mainnet**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **Polygon**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

## Flujo de Pago

1. **Usuario conecta wallet**
2. **Aprobar gasto** (si es necesario)
3. **Enviar pago** usando `sendPayment`
4. **Confirmar transacción** en la wallet
5. **Recibir confirmación** con hash de transacción

## Seguridad

### Características de Seguridad
- ✅ Uso de `transferFrom` en lugar de `transfer`
- ✅ Validación de direcciones
- ✅ Manejo de errores robusto
- ✅ Eventos para auditoría

### Consideraciones
- El contrato requiere aprobación previa del stablecoin
- Los usuarios deben tener suficiente balance
- Las transacciones son irreversibles

## Testing

### Tests Incluidos
- ✅ Deployment correcto
- ✅ Envío de pagos
- ✅ Manejo de errores
- ✅ Eventos emitidos
- ✅ Validaciones de balance

### Ejecutar Tests Específicos
```bash
# Solo tests de deployment
npx hardhat test --grep "Deployment"

# Solo tests de pagos
npx hardhat test --grep "sendPayment"
```

## Gas Optimization

### Optimizaciones Implementadas
- Uso de `external` para funciones públicas
- Eventos con `indexed` para mejor indexación
- Minimización de storage reads

### Estimación de Gas
```bash
npx hardhat test --gas
```

## Próximos Pasos

1. **Integración con Backend**: Conectar con tu API de autenticación
2. **Multi-token Support**: Agregar soporte para más stablecoins
3. **Batch Payments**: Pagos múltiples en una transacción
4. **Escalabilidad**: Implementar Layer 2 solutions
5. **Analytics**: Dashboard de transacciones

## Troubleshooting

### Problemas Comunes

**Error: "Transfer failed"**
- Verificar que el usuario tiene suficiente balance
- Verificar que se aprobó el gasto

**Error: "Contract not initialized"**
- Verificar que la dirección del contrato es correcta
- Verificar que la wallet está conectada

**Error: "Network not supported"**
- Verificar que estás en la red correcta
- Agregar la red a tu wallet si es necesario
