# CATE Frontend - Dashboard en Tiempo Real

Dashboard React con actualizaciones en tiempo real para monitorear transacciones blockchain.

## 🚀 Características

### ✅ Funcionalidades Principales

- **Carga Inicial** - Histórico de transacciones vía REST API
- **Tiempo Real** - Actualizaciones instantáneas vía Socket.IO
- **Autenticación** - JWT token automático desde localStorage
- **Upsert Inteligente** - Actualiza transacciones existentes o agrega nuevas
- **Estado de Conexión** - Indicador visual de conexión en tiempo real
- **Responsive** - Diseño adaptativo para móviles y desktop

### 📊 Información Mostrada

- **Estado** - Pending, Confirmed, Failed con iconos
- **Direcciones** - Remitente y destinatario (formato corto)
- **Monto** - Cantidad formateada con símbolo del token
- **Token** - Símbolo de la criptomoneda
- **Transacción** - Hash de la transacción (formato corto)
- **Bloque** - Número del bloque blockchain

## 🛠️ Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en el directorio del frontend:

```env
VITE_API_URL=http://localhost:4000
```

### 2. Instalar Dependencias

```bash
npm install socket.io-client axios
```

### 3. Autenticación

El dashboard automáticamente obtiene el token desde localStorage:

```javascript
// El token debe estar guardado como 'token'
localStorage.setItem('token', 'your_jwt_token_here');
```

## 🎯 Uso

### Componente Dashboard

```jsx
import Dashboard from './components/Dashboard';

function App() {
  return <Dashboard />;
}
```

### Flujo de Datos

1. **Carga Inicial** - GET `/transactions` para obtener histórico
2. **Conexión Socket** - Conecta con autenticación JWT
3. **Eventos en Tiempo Real**:
   - `newPayment` - Nueva transacción detectada
   - `paymentConfirmed` - Transacción confirmada
4. **Upsert Inteligente** - Actualiza o agrega transacciones

## 🔧 Implementación Técnica

### Socket.IO Connection

```javascript
const socket = ioClient(API_URL, {
  auth: { token }, // JWT token
  withCredentials: true,
  transports: ['websocket']
});
```

### Upsert Logic

```javascript
const upsert = (tx) => {
  setTransactions(prev => {
    const exists = prev.find(p => 
      p.tx_hash === tx.tx_hash && p.log_index === tx.log_index
    );
    
    if (exists) {
      // Actualizar transacción existente
      return prev.map(p => 
        (p.tx_hash === tx.tx_hash && p.log_index === tx.log_index) ? tx : p
      );
    }
    
    // Agregar nueva transacción al inicio
    return [tx, ...prev];
  });
};
```

### Event Handlers

```javascript
socket.on('connect', () => setIsConnected(true));
socket.on('newPayment', upsert);
socket.on('paymentConfirmed', upsert);
socket.on('disconnect', () => setIsConnected(false));
```

## 🎨 Estilos

### Clases CSS Principales

- `.dashboard` - Contenedor principal
- `.dashboard-header` - Header con título y estado de conexión
- `.transactions-table` - Tabla de transacciones
- `.status` - Badges de estado (pending, confirmed, failed)
- `.address` - Direcciones formateadas
- `.amount` - Montos con formato
- `.token` - Símbolos de tokens
- `.tx-hash` - Hashes de transacciones

### Estados Visuales

- **Conectado** - 🔌 Verde con "Conectado en tiempo real"
- **Desconectado** - ❌ Rojo con "Desconectado"
- **Loading** - Animación de carga
- **Error** - Mensaje de error en rojo

## 📱 Responsive Design

### Breakpoints

- **Desktop** - Tabla completa con todas las columnas
- **Tablet** - Columnas principales, scroll horizontal
- **Mobile** - Diseño compacto, columnas esenciales

### Adaptaciones Móviles

```css
@media (max-width: 768px) {
  .transactions-table {
    font-size: 0.8rem;
  }
  
  .table-container {
    overflow-x: auto;
  }
}
```

## 🔍 Debugging

### Logs del Cliente

```javascript
// Verificar conexión
console.log('Socket conectado:', socket.connected);

// Verificar eventos
socket.onAny((eventName, ...args) => {
  console.log('Evento recibido:', eventName, args);
});
```

### Verificar Autenticación

```javascript
// Verificar token
const token = localStorage.getItem('token');
console.log('Token disponible:', !!token);

// Verificar headers
axios.get('/transactions', { 
  withCredentials: true 
}).then(res => {
  console.log('API response:', res.data);
});
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Socket connection failed"**
- Verificar que el backend está ejecutándose
- Verificar VITE_API_URL en .env
- Verificar que el token es válido

**Error: "CORS error"**
- Verificar withCredentials: true
- Verificar configuración CORS en el backend

**No se ven actualizaciones en tiempo real**
- Verificar estado de conexión (🔌/❌)
- Verificar logs del navegador
- Verificar que el backend emite eventos

**Transacciones duplicadas**
- Verificar lógica de upsert
- Verificar que tx_hash y log_index son únicos

### Debugging Avanzado

```javascript
// Habilitar logs detallados de Socket.IO
const socket = ioClient(API_URL, {
  auth: { token },
  withCredentials: true,
  transports: ['websocket'],
  debug: true
});

// Verificar estado del componente
console.log('Transactions count:', transactions.length);
console.log('Connection status:', isConnected);
console.log('Loading state:', loading);
```

## 🔄 Próximos Pasos

1. **Filtros** - Filtrar por token, estado, fecha
2. **Búsqueda** - Buscar por dirección o hash
3. **Paginación** - Cargar más transacciones
4. **Exportar** - Descargar datos en CSV/JSON
5. **Notificaciones** - Push notifications para nuevos pagos
6. **Gráficos** - Visualizaciones de volumen y tendencias
