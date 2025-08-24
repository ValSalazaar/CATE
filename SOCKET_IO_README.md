# CATE - Socket.IO Authentication & Organization Rooms

Sistema de autenticación Socket.IO con unión automática a salas por organización y emisión segmentada de eventos.

## 🔐 Autenticación Socket.IO

### Handshake Authentication

```javascript
// Autenticación en handshake y unión a room org:{orgId}
io.use((socket, next) => {
  try {
    // Token puede venir en auth.token o en el header Authorization
    const fromAuth = socket.handshake.auth?.token;
    const fromHeader = socket.handshake.headers?.authorization;
    const token = fromAuth || (fromHeader?.startsWith('Bearer ') ? fromHeader.slice(7) : null);
    
    if (!token) return next(new Error('Unauthorized'));

    const payload = verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cate',
    });

    socket.data.user = {
      id: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
    };

    // Unir al room de la organización
    if (payload.orgId) {
      socket.join(`org:${payload.orgId}`);
    }

    return next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return next(new Error('Unauthorized'));
  }
});
```

### Conexión del Cliente

```javascript
// Frontend - Conexión con token
const socket = io(API_URL, {
  auth: { token: accessToken },
  withCredentials: true,
  transports: ['websocket']
});

// Alternativa con header Authorization
const socket = io(API_URL, {
  extraHeaders: {
    Authorization: `Bearer ${accessToken}`
  },
  withCredentials: true
});
```

## 🏢 Organization Rooms

### Unión Automática

Al autenticarse, el socket se une automáticamente a la sala de su organización:

```javascript
// Unión automática a room de organización
if (payload.orgId) {
  socket.join(`org:${payload.orgId}`);
}
```

### Estructura de Salas

- **`org:1`** - Organización con ID 1
- **`org:2`** - Organización con ID 2
- **`global`** - Sala global para eventos públicos

## 📡 Emisión Segmentada de Eventos

### Funciones de Emisión

```javascript
// Funciones de emisión segmentada
function emitPaymentCreated(orgId, payload) {
  io.to(`org:${orgId}`).emit('payments:new', payload);
}

function emitMatchingUpdate(orgId, payload) {
  io.to(`org:${orgId}`).emit('matching:update', payload);
}

function emitTransactionUpdate(orgId, payload) {
  io.to(`org:${orgId}`).emit('transactions:update', payload);
}
```

### Eventos Disponibles

| Evento | Descripción | Organización |
|--------|-------------|--------------|
| `transactions:update` | Nueva transacción detectada | Específica |
| `transactions:confirmed` | Transacción confirmada | Específica |
| `payments:new` | Nuevo pago creado | Específica |
| `matching:update` | Actualización de matching | Específica |

## 🔄 Flujo de Eventos

### 1. Detección de Transacción Blockchain

```javascript
// En services/blockchain.js
async function processEvent(event, io = null, isHistorical = false) {
  // ... procesamiento de evento ...
  
  // Determinar organización
  const orgId = await determineOrganizationForEvent(from, to, reference);
  
  if (orgId) {
    // Emitir solo a la organización
    io.to(`org:${orgId}`).emit('transactions:update', inserted);
  } else {
    // Emitir globalmente
    io.emit('transactions:update', inserted);
  }
}
```

### 2. Confirmación de Transacción

```javascript
function scheduleConfirmation(txHash, logIndex, blockNumber, io, orgId) {
  const targetBlock = blockNumber + confirmations - 1;
  
  provider.once(targetBlock, async () => {
    const updated = await updateTransactionStatus(txHash, logIndex);
    
    if (orgId) {
      io.to(`org:${orgId}`).emit('transactions:confirmed', updated);
    } else {
      io.emit('transactions:confirmed', updated);
    }
  });
}
```

## 🧪 Endpoints de Prueba

### Emitir Eventos de Prueba

```bash
# Emitir pago de prueba
curl -X POST http://localhost:4000/test/payments \
  -H "Content-Type: application/json" \
  -d '{"orgId": 1, "data": {"amount": 100, "currency": "MXN"}}'

# Emitir matching de prueba
curl -X POST http://localhost:4000/test/matching \
  -H "Content-Type: application/json" \
  -d '{"orgId": 1, "data": {"candidateId": "u_123", "jobId": "j_456", "status": "matched"}}'

# Emitir transacción de prueba
curl -X POST http://localhost:4000/test/transactions \
  -H "Content-Type: application/json" \
  -d '{"orgId": 1, "data": {"txHash": "0x123...", "amount": "1000000000000000000", "status": "confirmed"}}'
```

## 📱 Frontend Integration

### Hook de Socket.IO

```javascript
// hooks/useSocket.js
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(token) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket conectado:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
      setIsConnected(false);
    });

    // Escuchar eventos de transacciones
    socket.on('transactions:update', (data) => {
      console.log('💰 Nueva transacción:', data);
      setLastEvent({ type: 'transaction', data });
    });

    socket.on('transactions:confirmed', (data) => {
      console.log('✅ Transacción confirmada:', data);
      setLastEvent({ type: 'confirmation', data });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { isConnected, lastEvent, socket: socketRef.current };
}
```

### Componente Dashboard

```javascript
// components/Dashboard.jsx
import useSocket from '../hooks/useSocket';

export default function Dashboard() {
  const { user, token } = useAuth();
  const { isConnected, lastEvent } = useSocket(token);

  useEffect(() => {
    if (lastEvent) {
      // Actualizar UI basado en el evento
      if (lastEvent.type === 'transaction') {
        addTransaction(lastEvent.data);
      } else if (lastEvent.type === 'confirmation') {
        updateTransactionStatus(lastEvent.data);
      }
    }
  }, [lastEvent]);

  return (
    <div>
      <div className="connection-status">
        {isConnected ? '🔌 Conectado' : '❌ Desconectado'}
      </div>
      {/* Dashboard content */}
    </div>
  );
}
```

## 🔍 Logs y Debugging

### Logs del Servidor

```javascript
// Conexión de socket
console.log(`Socket conectado: user=${id} org=${orgId}`);

// Desconexión
console.log(`Socket desconectado: user=${id} org=${orgId} reason=${reason}`);

// Emisión de eventos
console.log(`📡 Evento emitido a organización ${orgId}: ${txHash}`);
console.log(`✅ Transacción confirmada para organización ${orgId}: ${txHash}`);
```

### Debugging del Cliente

```javascript
// Habilitar logs detallados
const socket = io(API_URL, {
  auth: { token },
  debug: true
});

// Verificar estado de conexión
console.log('Socket connected:', socket.connected);
console.log('Socket rooms:', socket.rooms);

// Escuchar todos los eventos
socket.onAny((eventName, ...args) => {
  console.log('Evento recibido:', eventName, args);
});
```

## 🛡️ Seguridad

### Validación de Tokens

```javascript
// Verificación estricta de JWT
const payload = verify(token, JWT_SECRET, {
  algorithms: ['HS256'],  // Solo HS256
  issuer: 'cate',        // Issuer específico
});
```

### Aislamiento por Organización

- **Eventos privados**: Solo se emiten a la organización correspondiente
- **Salas aisladas**: Cada organización tiene su propia sala
- **Validación de acceso**: Verificación de pertenencia a organización

## 📊 Monitoreo

### Métricas de Conexión

```javascript
// Contar conexiones por organización
const orgConnections = new Map();

io.on('connection', (socket) => {
  const { orgId } = socket.data.user;
  
  if (orgId) {
    const count = orgConnections.get(orgId) || 0;
    orgConnections.set(orgId, count + 1);
  }
  
  socket.on('disconnect', () => {
    if (orgId) {
      const count = orgConnections.get(orgId) || 0;
      orgConnections.set(orgId, Math.max(0, count - 1));
    }
  });
});
```

### Health Check

```javascript
app.get('/socket/health', (req, res) => {
  const stats = {
    totalConnections: io.engine.clientsCount,
    organizations: Array.from(orgConnections.entries()),
    uptime: process.uptime()
  };
  
  res.json(stats);
});
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Unauthorized"**
- Verificar que el token es válido
- Verificar que el token no ha expirado
- Verificar que el issuer es 'cate'

**No se reciben eventos**
- Verificar que el socket está conectado
- Verificar que el usuario pertenece a la organización
- Verificar que el evento se está emitiendo a la sala correcta

**Eventos duplicados**
- Verificar que no hay múltiples conexiones
- Verificar que el socket se desconecta correctamente

### Debugging Avanzado

```javascript
// Verificar salas activas
io.sockets.adapter.rooms.forEach((value, key) => {
  console.log(`Sala: ${key}, Conectados: ${value.size}`);
});

// Verificar usuarios en sala específica
const room = io.sockets.adapter.rooms.get(`org:1`);
if (room) {
  console.log(`Usuarios en org:1: ${room.size}`);
}
```

## 📈 Próximos Pasos

1. **Rate Limiting**: Límites de eventos por organización
2. **Persistencia**: Almacenar eventos no entregados
3. **Webhooks**: Notificaciones HTTP para eventos críticos
4. **Analytics**: Métricas detalladas de uso
5. **Multi-tenant**: Soporte para múltiples organizaciones por usuario
6. **Real-time Chat**: Chat en tiempo real por organización
