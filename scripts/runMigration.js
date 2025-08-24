const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const pool = new Pool();
  
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/202408_add_chain_columns.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Archivo de migración cargado');
    
    // Ejecutar la migración
    console.log('⚡ Ejecutando migración...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migración completada exitosamente');
    
    // Verificar que las columnas se agregaron correctamente
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('amount_wei', 'amount_formatted', 'token_symbol', 'chain_id', 'reference')
      ORDER BY column_name;
    `);
    
    console.log('📊 Columnas agregadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'transactions' 
      AND indexname LIKE '%tx_log%';
    `);
    
    console.log('🔍 Índices creados:');
    indexes.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    // Contar registros migrados
    const count = await pool.query(`
      SELECT COUNT(*) as total_transactions 
      FROM transactions;
    `);
    
    console.log(`📈 Total de transacciones en la base de datos: ${count.rows[0].total_transactions}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
