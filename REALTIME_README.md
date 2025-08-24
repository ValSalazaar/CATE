# CATE Real-Time Payments System

Sistema de pagos en tiempo real usando Socket.IO para notificaciones instantáneas de transacciones blockchain.

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Blockchain    │    │   Backend       │    │   Frontend      │
│   (Polygon)     │───▶│   (Socket.IO)   │───▶│   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   PaymentSent Events    Real-time Emission    Live Dashboard
```

## 🔧 Configuración

### Variables de Entorno

```env
# Server Configuration
PORT=4000

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
CATE_PAYMENTS_ADDRESS=0x...your_contract_address
```

### Dependencias

```bash
# Backend
npm install socket.io jsonwebtoken

# Frontend
npm install socket.io-client
```

## 🔐 Autenticación Socket.IO

### Backend Authentication

```javascript
// Auth por socket (JWT en auth.token o Authorization: Bearer)
io.use((socket, next) => {
  try {
    const bearer = socket.handshake.headers.authorization || '';
    const raw = socket.handshake.auth?.token || bearer.split(' ')[1];
    if (!raw) return next(new Error('No token'));
    const payload = verify(raw, process.env.JWT_SECRET);
    socket.user = payload;
    // Opcional: aislar por organización
    if (payload.orgId) socket.join(`org:${payload.orgId}`);
    return next();
  } catch (e) {
    return next(new Error('Unauthorized'));
  }
});
```

### Frontend Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your_jwt_token_here'
  },
  transports: ['websocket', 'polling']
});
```

## 📡 Eventos Socket.IO

### Eventos Emitidos por el Servidor

#### `payment:new`
Emitido cuando se detecta una nueva transacción blockchain.

```javascript
// Payload
{
  id: 1,
  sender: "0x1234...",
  receiver: "0x5678...",
  amount: "100000000",
  tx_hash: "0xabcd...",
  block_number: 12345678,
  timestamp: 1704067200,
  status: "confirmed",
  created_at: "2024-01-01T12:00:00Z"
}
```

### Eventos del Cliente

#### `join:org`
Unirse a una sala de organización específica.

```javascript
socket.emit('join:org', { orgId: 'org123' });
```

#### `leave:org`
Salir de una sala de organización.

```javascript
socket.emit('leave:org', { orgId: 'org123' });
```

## 🎯 Uso en React

### Hook useSocket

```javascript
import useSocket from './hooks/useSocket';

function MyComponent() {
  const { isConnected, lastPayment, error, emit, joinOrg } = useSocket(token);

  useEffect(() => {
    if (lastPayment) {
      console.log('Nuevo pago:', lastPayment);
      // Actualizar UI
    }
  }, [lastPayment]);

  return (
    <div>
      <p>Estado: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      {lastPayment && <p>Último pago: {lastPayment.amount}</p>}
    </div>
  );
}
```

### Dashboard con Tiempo Real

```javascript
export default function Dashboard({ token }) {
  const [transactions, setTransactions] = useState([]);
  const { isConnected, lastPayment } = useSocket(token);

  // Cargar transacciones iniciales
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Actualizar en tiempo real
  useEffect(() => {
    if (lastPayment) {
      setTransactions(prev => [lastPayment, ...prev]);
    }
  }, [lastPayment]);

  return (
    <div>
      <div className="connection-status">
        {isConnected ? '🔌 Conectado' : '❌ Desconectado'}
      </div>
      {/* Tabla de transacciones */}
    </div>
  );
}
```

## 🔄 Flujo de Datos

### 1. Evento Blockchain
```solidity
event PaymentSent(address indexed from, address indexed to, uint256 amount);
```

### 2. Listener Backend
```javascript
contract.on("PaymentSent", async (from, to, amount, event) => {
  // Guardar en base de datos
  const transaction = await saveToDatabase(from, to, amount, event);
  
  // Emitir por Socket.IO
  io.emit('payment:new', transaction);
});
```

### 3. Frontend React
```javascript
socket.on('payment:new', (paymentData) => {
  // Actualizar estado del componente
  setTransactions(prev => [paymentData, ...prev]);
});
```

## 🛠️ Características

### ✅ Funcionalidades

- **Autenticación JWT** - Conexiones seguras con tokens
- **Organizaciones** - Salas separadas por organización
- **Reconexión Automática** - Manejo de desconexiones
- **Fallback Transport** - WebSocket + Polling
- **Error Handling** - Manejo robusto de errores
- **Real-time Updates** - Actualizaciones instantáneas

### 📊 Métricas en Tiempo Real

- Estado de conexión
- Última transacción recibida
- Latencia de red
- Errores de conexión

## 🔍 Debugging

### Logs del Servidor

```bash
# Ver conexiones socket
Socket conectado abc123 org:company1
Socket desconectado abc123

# Ver eventos blockchain
💰 Pago detectado: 0x1234... → 0x5678... : 100.00 USDC
📡 Evento emitido por Socket.IO
```

### Logs del Cliente

```javascript
// En el navegador
🔌 Socket conectado: abc123
💰 Nuevo pago recibido: { id: 1, amount: "100000000", ... }
```

### Verificar Conexión

```javascript
// Backend
io.engine.clientsCount // Número de clientes conectados

// Frontend
socket.connected // Estado de conexión
socket.id // ID del socket
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Unauthorized"**
- Verificar que el token JWT es válido
- Verificar que JWT_SECRET está configurado

**Error: "No token"**
- Verificar que el token se envía en auth.token
- Verificar que el token no está expirado

**Conexión fallida**
- Verificar FRONTEND_ORIGIN en CORS
- Verificar que el puerto 4000 está disponible

**Eventos no llegan**
- Verificar que el listener blockchain está activo
- Verificar logs del servidor
- Verificar que el contrato emite eventos

### Debugging Avanzado

```javascript
// Habilitar logs detallados
const socket = io('http://localhost:4000', {
  auth: { token },
  transports: ['websocket', 'polling'],
  debug: true
});

// Verificar eventos
socket.onAny((eventName, ...args) => {
  console.log('Evento recibido:', eventName, args);
});
```

## 🔄 Próximos Pasos

1. **Escalabilidad**: Implementar Redis para múltiples instancias
2. **Persistencia**: Guardar eventos en base de datos
3. **Notificaciones**: Push notifications para móviles
4. **Analytics**: Métricas de uso en tiempo real
5. **Seguridad**: Rate limiting y validación adicional
6. **Monitoreo**: Health checks y alertas
