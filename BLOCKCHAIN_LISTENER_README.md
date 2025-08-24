# CATE Blockchain Event Listener

Sistema de monitoreo de eventos blockchain para el contrato CatePayments que almacena transacciones en PostgreSQL.

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Blockchain    │    │   Event Listener│    │   PostgreSQL    │
│   (Polygon)     │───▶│   (Node.js)     │───▶│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   PaymentSent Events    Process & Store        Transactions Table
```

## 📁 Estructura de Archivos

```
listeners/
├── paymentListener.js              # Listener básico
└── paymentListenerEnhanced.js      # Listener con features avanzadas

scripts/
└── runListener.js                  # Script para ejecutar el listener

database/
└── transactions_schema.sql         # Schema de la base de datos

routes/
└── transactions.js                 # API endpoints para consultas
```

## 🚀 Configuración

### 1. Variables de Entorno

Agrega estas variables a tu `.env`:

```env
# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
CATE_PAYMENTS_ADDRESS=0x...your_deployed_contract_address

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cate_payments
DB_USER=your_username
DB_PASSWORD=your_password
```

### 2. Base de Datos

Ejecuta el schema de la base de datos:

```bash
psql -d your_database -f database/transactions_schema.sql
```

## 🎧 Uso del Listener

### Ejecutar Listener Básico

```bash
node scripts/runListener.js
```

### Ejecutar con Eventos Históricos

```bash
# Procesar todos los eventos históricos
node scripts/runListener.js --historical

# Procesar desde un bloque específico
node scripts/runListener.js --historical --from-block 12345678
```

### Usar el Listener en tu Código

```javascript
const { listenPayments, stopListening } = require('./listeners/paymentListenerEnhanced');

// Iniciar listener
await listenPayments();

// Detener listener
await stopListening();
```

## 📊 API Endpoints

### Obtener Transacciones Recientes

```http
GET /transactions/recent?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sender": "0x1234...",
      "receiver": "0x5678...",
      "amount": "100000000",
      "tx_hash": "0xabcd...",
      "block_number": 12345678,
      "transaction_time": "2024-01-01T12:00:00Z",
      "status": "confirmed"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### Obtener Transacciones por Dirección

```http
GET /transactions/address/0x1234...?limit=50&offset=0
```

### Obtener Estadísticas

```http
GET /transactions/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_transactions": 100,
    "total_amount": "1000000000",
    "unique_senders": 25,
    "unique_receivers": 30,
    "last_transaction_time": "2024-01-01T12:00:00Z"
  }
}
```

### Obtener Transacción por Hash

```http
GET /transactions/hash/0xabcd...
```

### Obtener Logs de Error

```http
GET /transactions/errors?limit=20
```

## 🔧 Características del Listener

### ✅ Funcionalidades

- **Monitoreo en Tiempo Real**: Escucha eventos `PaymentSent` del contrato
- **Almacenamiento Automático**: Guarda transacciones en PostgreSQL
- **Manejo de Errores**: Logs de errores para debugging
- **Eventos Históricos**: Procesamiento de eventos pasados
- **Graceful Shutdown**: Cierre limpio del listener
- **Reconexión Automática**: Manejo de desconexiones de red

### 📈 Métricas Capturadas

- Dirección del remitente
- Dirección del destinatario
- Cantidad transferida
- Hash de la transacción
- Número de bloque
- Timestamp
- Estado de la transacción

## 🛠️ Desarrollo

### Estructura de la Base de Datos

```sql
-- Tabla principal de transacciones
transactions (
  id, sender, receiver, amount, tx_hash, 
  block_number, timestamp, status, created_at, updated_at
)

-- Tabla de logs de errores
error_logs (
  id, error_message, event_data, timestamp, created_at
)

-- Vistas útiles
recent_transactions -- Últimas 100 transacciones
get_transaction_stats() -- Estadísticas agregadas
```

### Índices para Performance

- `idx_transactions_sender` - Búsquedas por remitente
- `idx_transactions_receiver` - Búsquedas por destinatario
- `idx_transactions_tx_hash` - Búsquedas por hash
- `idx_transactions_timestamp` - Ordenamiento por tiempo
- `idx_transactions_sender_timestamp` - Consultas compuestas

## 🔍 Monitoreo y Debugging

### Logs del Listener

```bash
# Ver logs en tiempo real
tail -f logs/listener.log

# Buscar errores
grep "ERROR" logs/listener.log
```

### Consultas Útiles

```sql
-- Últimas transacciones
SELECT * FROM recent_transactions;

-- Estadísticas generales
SELECT * FROM get_transaction_stats();

-- Transacciones por dirección
SELECT * FROM transactions 
WHERE sender = '0x1234...' OR receiver = '0x1234...'
ORDER BY timestamp DESC;

-- Errores recientes
SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Contract not found"**
- Verificar que `CATE_PAYMENTS_ADDRESS` es correcta
- Verificar que el contrato está desplegado en la red correcta

**Error: "RPC connection failed"**
- Verificar que `POLYGON_RPC_URL` es válida
- Verificar conectividad de red

**Error: "Database connection failed"**
- Verificar credenciales de base de datos
- Verificar que PostgreSQL está ejecutándose

**Eventos no se están capturando**
- Verificar que el listener está ejecutándose
- Verificar logs de errores
- Verificar que el contrato emite eventos correctamente

### Debugging

```bash
# Verificar conexión al contrato
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contract = new ethers.Contract(process.env.CATE_PAYMENTS_ADDRESS, ['event PaymentSent(address,address,uint256)'], provider);
console.log('Contract address:', await contract.getAddress());
"

# Verificar conexión a la base de datos
node -e "
const { Pool } = require('pg');
const pool = new Pool();
pool.query('SELECT NOW()').then(result => {
  console.log('DB connected:', result.rows[0]);
  pool.end();
});
"
```

## 🔄 Próximos Pasos

1. **Escalabilidad**: Implementar múltiples listeners para alta disponibilidad
2. **Analytics**: Dashboard de métricas en tiempo real
3. **Notificaciones**: Alertas por email/SMS para transacciones importantes
4. **Multi-red**: Soporte para múltiples blockchains
5. **Cache**: Implementar Redis para consultas frecuentes
6. **API Rate Limiting**: Protección contra abuso de la API
