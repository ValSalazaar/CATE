const { ethers } = require('ethers');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contractAddress = process.env.CATE_PAYMENTS_ADDRESS;

/**
 * Verifica y marca transacciones huérfanas debido a reorgs
 */
async function handleReorgs() {
  try {
    console.log('🔍 Verificando transacciones por reorgs...');
    
    // Obtener transacciones pendientes y confirmadas recientes
    const result = await pool.query(`
      SELECT tx_hash, log_index, block_number, status
      FROM transactions 
      WHERE status IN ('pending', 'confirmed')
      AND block_number > 0
      ORDER BY block_number DESC
      LIMIT 100
    `);
    
    console.log(`📊 Verificando ${result.rows.length} transacciones...`);
    
    let orphanedCount = 0;
    
    for (const tx of result.rows) {
      try {
        // Verificar si el bloque existe y tiene el hash correcto
        const block = await provider.getBlock(tx.block_number);
        
        if (!block) {
          console.log(`❌ Bloque ${tx.block_number} no existe - marcando como huérfano`);
          await markTransactionOrphaned(tx.tx_hash, tx.log_index);
          orphanedCount++;
          continue;
        }
        
        // Verificar si la transacción existe en el bloque
        const receipt = await provider.getTransactionReceipt(tx.tx_hash);
        
        if (!receipt) {
          console.log(`❌ Transacción ${tx.tx_hash} no existe - marcando como huérfano`);
          await markTransactionOrphaned(tx.tx_hash, tx.log_index);
          orphanedCount++;
          continue;
        }
        
        // Verificar si el bloque de la transacción coincide
        if (receipt.blockNumber !== tx.block_number) {
          console.log(`❌ Mismatch de bloque para ${tx.tx_hash} - marcando como huérfano`);
          await markTransactionOrphaned(tx.tx_hash, tx.log_index);
          orphanedCount++;
        }
        
      } catch (error) {
        console.error(`Error verificando transacción ${tx.tx_hash}:`, error);
        // Marcar como huérfano si hay error
        await markTransactionOrphaned(tx.tx_hash, tx.log_index);
        orphanedCount++;
      }
    }
    
    console.log(`✅ Verificación completada. ${orphanedCount} transacciones marcadas como huérfanas`);
    
  } catch (error) {
    console.error('❌ Error verificando reorgs:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Marca una transacción como huérfana
 */
async function markTransactionOrphaned(txHash, logIndex) {
  await pool.query(
    `UPDATE transactions 
     SET status = 'orphaned', updated_at = CURRENT_TIMESTAMP 
     WHERE tx_hash = $1 AND log_index = $2`,
    [txHash, logIndex]
  );
}

/**
 * Resincroniza desde un bloque específico
 */
async function resyncFromBlock(fromBlock) {
  try {
    console.log(`🔄 Resincronizando desde bloque ${fromBlock}...`);
    
    const { processHistoricalEvents } = require('../services/blockchain');
    await processHistoricalEvents(fromBlock, 'latest');
    
    console.log('✅ Resincronización completada');
    
  } catch (error) {
    console.error('❌ Error en resincronización:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check-reorgs':
      handleReorgs()
        .then(() => {
          console.log('🎉 Verificación de reorgs completada');
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Error:', error);
          process.exit(1);
        });
      break;
      
    case 'resync':
      const fromBlock = parseInt(process.argv[3]) || 0;
      resyncFromBlock(fromBlock)
        .then(() => {
          console.log('🎉 Resincronización completada');
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Error:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Uso:');
      console.log('  node scripts/handleReorgs.js check-reorgs');
      console.log('  node scripts/handleReorgs.js resync [fromBlock]');
      process.exit(1);
  }
}

module.exports = {
  handleReorgs,
  markTransactionOrphaned,
  resyncFromBlock
};
