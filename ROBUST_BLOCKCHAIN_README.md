# CATE - Blockchain Robustness & Reliability

Sistema robusto para manejo de eventos blockchain con confirmaciones configurables, catch-up automático y protección contra reorganizaciones.

## 🛡️ Características de Robustez

### ✅ Confirmaciones Configurables

**Configuración:**
```env
# Desarrollo/Testing - Confirmación instantánea
CONFIRMATIONS=1

# Producción - Mayor seguridad
CONFIRMATIONS=5
CONFIRMATIONS=12
```

**Flujo de Confirmaciones:**
1. **Evento Detectado** → Status: `pending`
2. **Emitir** → `newPayment` event
3. **Esperar Confirmaciones** → `CONFIRMATIONS` bloques
4. **Confirmar** → Status: `confirmed`
5. **Emitir** → `paymentConfirmed` event

### 🔄 Catch-up Automático

**Funcionamiento:**
- Al reiniciar, verifica el último bloque procesado
- Procesa eventos perdidos automáticamente
- No se pierden transacciones por downtime

**Implementación:**
```javascript
// Tabla sync_state
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// Estado de sincronización
await updateSyncState('last_processed_block', String(blockNumber));
const lastBlock = await getSyncState('last_processed_block');
```

### 🛡️ Protección contra Reorgs

**Detección de Reorgs:**
- Verificación de existencia de bloques
- Validación de hashes de transacciones
- Marcado de transacciones huérfanas

**Estados de Transacción:**
- `pending` - Transacción recién detectada
- `confirmed` - Transacción confirmada
- `orphaned` - Transacción afectada por reorg
- `failed` - Transacción fallida

## 🗄️ Base de Datos

### Tabla sync_state

```sql
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funciones helper
CREATE OR REPLACE FUNCTION update_sync_state(sync_key TEXT, sync_value TEXT)
CREATE OR REPLACE FUNCTION get_sync_state(sync_key TEXT)
```

### Índices Únicos

```sql
-- Prevenir duplicados
CREATE UNIQUE INDEX ux_transactions_tx_log ON transactions(tx_hash, log_index);

-- Performance
CREATE INDEX idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at);
```

## 🔧 Implementación Técnica

### Procesamiento de Eventos

```javascript
async function processEvent(event, io = null, isHistorical = false) {
  const { from, to, amount, reference } = event.args;
  const txHash = event.log.transactionHash;
  const logIndex = event.log.index;
  const blockNumber = event.log.blockNumber;
  
  // Verificar confirmaciones
  const current = await provider.getBlockNumber();
  const confirmed = (current - blockNumber + 1) >= confirmations;
  
  const payload = {
    sender: from,
    receiver: to,
    amount_wei: amount.toString(),
    amount_formatted: normalizeAmount(amount),
    token_symbol: process.env.TOKEN_SYMBOL,
    tx_hash: txHash,
    log_index: logIndex,
    block_number: blockNumber,
    chain_id: Number(process.env.CHAIN_ID),
    status: confirmed ? 'confirmed' : 'pending',
    block_time: block.timestamp,
    reference: ethers.hexlify(reference)
  };
  
  const inserted = await upsertTx(payload);
  
  // Emitir eventos en tiempo real
  if (inserted && io && !isHistorical) {
    io.emit('newPayment', inserted);
    
    if (!confirmed) {
      scheduleConfirmation(txHash, logIndex, blockNumber, io);
    }
  }
  
  // Actualizar estado de sincronización
  await updateSyncState('last_processed_block', String(blockNumber));
}
```

### Programación de Confirmaciones

```javascript
function scheduleConfirmation(txHash, logIndex, blockNumber, io) {
  const targetBlock = blockNumber + confirmations - 1;
  
  provider.once(targetBlock, async () => {
    const updated = await pool.query(
      `UPDATE transactions SET status='confirmed', updated_at=CURRENT_TIMESTAMP 
       WHERE tx_hash=$1 AND log_index=$2 RETURNING *`,
      [txHash, logIndex]
    );
    
    if (updated.rows[0]) {
      io.emit('paymentConfirmed', updated.rows[0]);
    }
  });
}
```

### Catch-up Automático

```javascript
async function listenPayments(io) {
  // Obtener último bloque procesado
  const lastProcessedBlock = await getSyncState('last_processed_block');
  const currentBlock = await provider.getBlockNumber();
  
  // Procesar eventos perdidos
  if (parseInt(lastProcessedBlock) < currentBlock - 1) {
    await processHistoricalEvents(parseInt(lastProcessedBlock) + 1, currentBlock);
  }
  
  // Iniciar listener en tiempo real
  const contract = new ethers.Contract(contractAddress, abi, provider);
  contract.on("PaymentSent", async (from, to, amount, reference, event) => {
    await processEvent(event, io, false);
  });
}
```

## 🛠️ Scripts de Mantenimiento

### Verificación de Reorgs

```bash
# Verificar transacciones por reorgs
node scripts/handleReorgs.js check-reorgs

# Resincronizar desde un bloque específico
node scripts/handleReorgs.js resync 1000000
```

### Migración de Base de Datos

```bash
# Ejecutar migración
node scripts/runMigration.js

# Verificar estado
psql -d your_database -c "SELECT * FROM sync_state;"
```

## 📊 Monitoreo

### Logs del Sistema

```javascript
// Logs de confirmaciones
console.log(`✅ Transacción confirmada: ${txHash}`);

// Logs de catch-up
console.log(`📚 Procesando eventos históricos desde bloque ${fromBlock}`);

// Logs de reorgs
console.log(`❌ Transacción ${txHash} marcada como huérfana`);
```

### Métricas de Estado

```javascript
// Verificar estado del listener
const isListening = blockchainService.isListening();
const isProcessing = blockchainService.isProcessing();

// Obtener estadísticas
const stats = await blockchainService.getTransactionStats();
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Ya hay un proceso de catch-up en ejecución"**
- El sistema previene múltiples procesos simultáneos
- Esperar a que termine el proceso actual
- Verificar logs para estado del proceso

**Error: "Transacciones duplicadas"**
- Verificar índice único `(tx_hash, log_index)`
- Verificar lógica de upsert
- Revisar logs de conflicto

**Error: "Eventos perdidos"**
- Verificar tabla `sync_state`
- Ejecutar resincronización manual
- Verificar conectividad RPC

### Debugging Avanzado

```javascript
// Verificar estado de sincronización
const lastBlock = await getSyncState('last_processed_block');
console.log('Último bloque procesado:', lastBlock);

// Verificar transacciones huérfanas
const orphaned = await pool.query(
  "SELECT COUNT(*) FROM transactions WHERE status = 'orphaned'"
);
console.log('Transacciones huérfanas:', orphaned.rows[0].count);

// Verificar confirmaciones pendientes
const pending = await pool.query(
  "SELECT COUNT(*) FROM transactions WHERE status = 'pending'"
);
console.log('Confirmaciones pendientes:', pending.rows[0].count);
```

## 🔄 Configuración por Entorno

### Desarrollo/Testing
```env
CONFIRMATIONS=1
POLYGON_RPC_URL=https://polygon-rpc.com
```

### Staging
```env
CONFIRMATIONS=3
POLYGON_RPC_URL=https://polygon-rpc.com
```

### Producción
```env
CONFIRMATIONS=12
POLYGON_RPC_URL=https://polygon-rpc.com
```

## 📈 Próximos Pasos

1. **Alertas** - Notificaciones para reorgs y eventos críticos
2. **Métricas** - Dashboard de métricas de blockchain
3. **Backup** - Sistema de backup de eventos
4. **Multi-chain** - Soporte para múltiples redes
5. **Optimización** - Batch processing para eventos masivos
6. **Auditoría** - Logs detallados para auditoría
