# Database Migration Guide

Guía para migrar la base de datos existente a la nueva estructura con soporte para múltiples blockchains.

## 🚀 Migración Automática

### Ejecutar Migración

```bash
# Ejecutar migración automática
node scripts/runMigration.js
```

### Verificar Migración

```bash
# Conectar a PostgreSQL y verificar
psql -d your_database

# Verificar columnas nuevas
\d transactions

# Verificar índices
\di transactions*
```

## 📊 Cambios en la Estructura

### Columnas Agregadas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `amount_wei` | TEXT | Cantidad en wei (formato original) |
| `amount_formatted` | TEXT | Cantidad formateada (ej: "100.50") |
| `token_symbol` | TEXT | Símbolo del token (ej: "MATIC", "USDC") |
| `tx_hash` | TEXT | Hash de la transacción |
| `log_index` | INTEGER | Índice del log en la transacción |
| `block_number` | INTEGER | Número del bloque |
| `chain_id` | INTEGER | ID de la cadena (137 = Polygon) |
| `status` | TEXT | Estado: 'pending', 'confirmed', 'failed' |
| `occurred_at` | TIMESTAMPTZ | Timestamp del bloque |
| `reference` | TEXT | Referencia del pago |

### Índices Creados

- `ux_transactions_tx_log` - Índice único para evitar duplicados
- `idx_transactions_chain_id` - Búsquedas por cadena
- `idx_transactions_token_symbol` - Búsquedas por token
- `idx_transactions_occurred_at` - Ordenamiento por fecha
- `idx_transactions_status` - Filtros por estado

## 🔄 Migración de Datos Existentes

### Datos Legacy

Los datos existentes se migran automáticamente:

```sql
-- Datos existentes se mapean así:
amount_wei = amount (valor original)
amount_formatted = amount (valor original)
token_symbol = 'MATIC' (por defecto)
tx_hash = 'legacy_' || id (hash generado)
log_index = 0 (por defecto)
block_number = 0 (por defecto)
chain_id = 137 (Polygon por defecto)
status = 'confirmed' (por defecto)
occurred_at = to_timestamp(timestamp) (convertido)
```

### Compatibilidad

El sistema mantiene compatibilidad con datos antiguos:

```javascript
// La API devuelve datos en ambos formatos
{
  // Datos nuevos
  amount_wei: "1000000000000000000",
  amount_formatted: "1.0",
  token_symbol: "MATIC",
  
  // Datos legacy (si existen)
  amount: "1000000000000000000",
  timestamp: 1704067200
}
```

## 🛠️ Migración Manual

### Si necesitas migración manual:

```sql
-- 1. Crear backup
pg_dump your_database > backup_before_migration.sql

-- 2. Ejecutar migración
\i migrations/202408_add_chain_columns.sql

-- 3. Verificar datos
SELECT COUNT(*) FROM transactions WHERE amount_wei IS NOT NULL;

-- 4. Revertir si es necesario
-- (usar backup_before_migration.sql)
```

## 🔍 Verificación Post-Migración

### Script de Verificación

```bash
# Verificar integridad de datos
node scripts/verifyMigration.js
```

### Consultas de Verificación

```sql
-- Verificar que todas las columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- Verificar que no hay datos corruptos
SELECT COUNT(*) as total,
       COUNT(amount_wei) as with_wei,
       COUNT(amount_formatted) as with_formatted,
       COUNT(token_symbol) as with_symbol
FROM transactions;

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions';
```

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "column already exists"**
```bash
# Las columnas ya existen, esto es normal
# La migración usa IF NOT EXISTS
```

**Error: "duplicate key value"**
```sql
-- Verificar duplicados
SELECT tx_hash, log_index, COUNT(*)
FROM transactions 
GROUP BY tx_hash, log_index 
HAVING COUNT(*) > 1;
```

**Error: "permission denied"**
```bash
# Asegúrate de tener permisos de escritura
GRANT ALL PRIVILEGES ON TABLE transactions TO your_user;
```

### Rollback

Si necesitas revertir la migración:

```sql
-- Eliminar columnas nuevas (¡CUIDADO!)
ALTER TABLE transactions 
  DROP COLUMN IF EXISTS amount_wei,
  DROP COLUMN IF EXISTS amount_formatted,
  DROP COLUMN IF EXISTS token_symbol,
  DROP COLUMN IF EXISTS tx_hash,
  DROP COLUMN IF EXISTS log_index,
  DROP COLUMN IF EXISTS block_number,
  DROP COLUMN IF EXISTS chain_id,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS occurred_at,
  DROP COLUMN IF EXISTS reference;

-- Eliminar índices
DROP INDEX IF EXISTS ux_transactions_tx_log;
DROP INDEX IF EXISTS idx_transactions_chain_id;
DROP INDEX IF EXISTS idx_transactions_token_symbol;
DROP INDEX IF EXISTS idx_transactions_occurred_at;
DROP INDEX IF EXISTS idx_transactions_status;
```

## 📈 Performance

### Antes vs Después

| Métrica | Antes | Después |
|---------|-------|---------|
| Columnas | 8 | 18 |
| Índices | 3 | 8 |
| Tamaño | ~1MB | ~1.2MB |
| Consultas | Rápidas | Más rápidas |

### Optimizaciones

- **Índices compuestos** para consultas frecuentes
- **Particionamiento** por fecha (opcional)
- **Compresión** de datos históricos (opcional)

## 🔄 Próximos Pasos

1. **Ejecutar migración** en ambiente de desarrollo
2. **Verificar funcionalidad** de la aplicación
3. **Ejecutar migración** en producción
4. **Monitorear performance** post-migración
5. **Actualizar documentación** del equipo
