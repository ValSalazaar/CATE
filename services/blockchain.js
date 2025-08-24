// src/services/blockchain.js
const { ethers } = require('ethers');
const { Pool } = require('pg');
const organizationService = require('./organizations');

const pool = new Pool();
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contractAddress = process.env.CATE_PAYMENTS_ADDRESS;
const confirmations = Number(process.env.CONFIRMATIONS || 1);

// ABI mínimo
const abi = [
  "event PaymentSent(address indexed from, address indexed to, uint256 amount, bytes32 reference)"
];

let isListening = false;
let isProcessing = false;

function normalizeAmount(amountBN, decimals = 18) {
  // Evita traer ethers al frontend si no quieres; manda ambos formatos
  const asString = amountBN.toString();
  const whole = asString.slice(0, -decimals) || '0';
  const frac = asString.slice(-decimals).padStart(decimals, '0');
  return `${whole}.${frac}`.replace(/\.$/, '.0');
}

async function upsertTx(row) {
  const q = `
    INSERT INTO transactions
      (sender, receiver, amount_wei, amount_formatted, token_symbol, tx_hash, log_index, block_number, chain_id, status, occurred_at, reference)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11), $12)
    ON CONFLICT (tx_hash, log_index) 
    DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const vals = [
    row.sender, row.receiver, row.amount_wei, row.amount_formatted, row.token_symbol,
    row.tx_hash, row.log_index, row.block_number, row.chain_id, row.status, row.block_time, row.reference
  ];
  const res = await pool.query(q, vals);
  return res.rows[0] || null;
}

async function updateSyncState(key, value) {
  await pool.query('SELECT update_sync_state($1, $2)', [key, value]);
}

async function getSyncState(key) {
  const result = await pool.query('SELECT get_sync_state($1) as value', [key]);
  return result.rows[0].value;
}

async function markTransactionOrphaned(txHash, logIndex) {
  await pool.query(
    `UPDATE transactions 
     SET status = 'orphaned', updated_at = CURRENT_TIMESTAMP 
     WHERE tx_hash = $1 AND log_index = $2`,
    [txHash, logIndex]
  );
}

/**
 * Procesa eventos históricos (catch-up)
 */
async function processHistoricalEvents(fromBlock, toBlock = 'latest') {
  if (isProcessing) {
    console.log('⚠️ Ya hay un proceso de catch-up en ejecución');
    return;
  }

  isProcessing = true;
  
  try {
    console.log(`📚 Procesando eventos históricos desde bloque ${fromBlock} hasta ${toBlock}...`);
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const events = await contract.queryFilter("PaymentSent", fromBlock, toBlock);
    
    console.log(`📊 Encontrados ${events.length} eventos históricos`);
    
    for (const event of events) {
      await processEvent(event, null, true); // true = historical processing
    }
    
    console.log('✅ Procesamiento de eventos históricos completado');
    
  } catch (error) {
    console.error('❌ Error procesando eventos históricos:', error);
    throw error;
  } finally {
    isProcessing = false;
  }
}

/**
 * Procesa un evento individual
 */
async function processEvent(event, io = null, isHistorical = false) {
  try {
    const { from, to, amount, reference } = event.args;
    const txHash = event.log.transactionHash;
    const logIndex = event.log.index;
    const blockNumber = event.log.blockNumber;
    
    // Verificar si ya existe
    const existing = await pool.query(
      'SELECT id, status FROM transactions WHERE tx_hash = $1 AND log_index = $2',
      [txHash, logIndex]
    );

    // Obtener información del bloque
    const block = await provider.getBlock(blockNumber);
    const current = await provider.getBlockNumber();
    const confirmed = (current - blockNumber + 1) >= confirmations;

    const payload = {
      sender: from,
      receiver: to,
      amount_wei: amount.toString(),
      amount_formatted: normalizeAmount(amount, Number(process.env.TOKEN_DECIMALS || 18)),
      token_symbol: process.env.TOKEN_SYMBOL || 'MATIC',
      tx_hash: txHash,
      log_index: logIndex,
      block_number: blockNumber,
      chain_id: Number(process.env.CHAIN_ID || 137),
      status: confirmed ? 'confirmed' : 'pending',
      block_time: block.timestamp,
      reference: typeof reference === 'string' ? reference : ethers.hexlify(reference)
    };

    const inserted = await upsertTx(payload);

    // Emitir eventos solo si no es procesamiento histórico
    if (inserted && io && !isHistorical) {
      // Determinar organización para el evento
      const orgId = await determineOrganizationForEvent(from, to, reference);
      
      if (orgId) {
        // Emitir a la sala específica de la organización
        io.to(`org:${orgId}`).emit('transactions:update', inserted);
        console.log(`📡 Evento emitido a organización ${orgId}: ${txHash}`);
      } else {
        // Emitir globalmente si no hay organización específica
        io.emit('transactions:update', inserted);
        console.log(`📡 Evento emitido globalmente: ${txHash}`);
      }
      
      // Si está pendiente, programar confirmación
      if (!confirmed) {
        scheduleConfirmation(txHash, logIndex, blockNumber, io, orgId);
      }
    }

    // Actualizar estado de sincronización
    await updateSyncState('last_processed_block', String(blockNumber));

  } catch (error) {
    console.error('Error procesando evento:', error);
    throw error;
  }
}

/**
 * Determina la organización para un evento basado en sender, receiver o reference
 */
async function determineOrganizationForEvent(sender, receiver, reference) {
  try {
    // 1. Intentar por receiver (destinatario)
    let org = await organizationService.getOrganizationByWallet(receiver);
    if (org) {
      console.log(`🏢 Organización encontrada por receiver: ${org.name}`);
      return org.id;
    }

    // 2. Intentar por sender (remitente)
    org = await organizationService.getOrganizationByWallet(sender);
    if (org) {
      console.log(`🏢 Organización encontrada por sender: ${org.name}`);
      return org.id;
    }

    // 3. Intentar por reference (referencia de factura)
    if (reference) {
      org = await organizationService.getOrganizationByReference(reference);
      if (org) {
        console.log(`🏢 Organización encontrada por reference: ${org.name}`);
        return org.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error determinando organización:', error);
    return null;
  }
}

/**
 * Programa la confirmación de una transacción
 */
function scheduleConfirmation(txHash, logIndex, blockNumber, io, orgId = null) {
  const targetBlock = blockNumber + confirmations - 1;
  
  provider.once(targetBlock, async () => {
    try {
      const updated = await pool.query(
        `UPDATE transactions SET status='confirmed', updated_at=CURRENT_TIMESTAMP 
         WHERE tx_hash=$1 AND log_index=$2 RETURNING *`,
        [txHash, logIndex]
      );
      
              if (updated.rows[0]) {
          if (orgId) {
            // Emitir a la sala específica de la organización
            io.to(`org:${orgId}`).emit('transactions:confirmed', updated.rows[0]);
            console.log(`✅ Transacción confirmada para organización ${orgId}: ${txHash}`);
          } else {
            // Emitir globalmente
            io.emit('transactions:confirmed', updated.rows[0]);
            console.log(`✅ Transacción confirmada globalmente: ${txHash}`);
          }
        }
    } catch (error) {
      console.error('Error confirmando transacción:', error);
    }
  });
}

/**
 * Inicia la escucha de eventos de pago del contrato
 */
async function listenPayments(io) {
  if (isListening) {
    console.log('🔄 Ya está escuchando eventos de pago');
    return;
  }

  try {
    console.log('🚀 Iniciando listener de pagos blockchain...');
    
    // Obtener último bloque procesado
    const lastProcessedBlock = await getSyncState('last_processed_block');
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`📊 Último bloque procesado: ${lastProcessedBlock}`);
    console.log(`📊 Bloque actual: ${currentBlock}`);
    
    // Procesar eventos perdidos si es necesario
    if (parseInt(lastProcessedBlock) < currentBlock - 1) {
      console.log('🔄 Procesando eventos perdidos...');
      await processHistoricalEvents(parseInt(lastProcessedBlock) + 1, currentBlock);
    }

    const contract = new ethers.Contract(contractAddress, abi, provider);

    contract.on("PaymentSent", async (from, to, amount, reference, event) => {
      await processEvent(event, io, false);
    });

    isListening = true;
    console.log('🎧 Listener de pagos blockchain iniciado correctamente');

  } catch (error) {
    console.error('❌ Error iniciando listener blockchain:', error);
    throw error;
  }
}

/**
 * Detiene la escucha de eventos
 */
async function stopListening() {
  try {
    contract.removeAllListeners();
    isListening = false;
    console.log('🛑 Listener de pagos blockchain detenido');
  } catch (error) {
    console.error('Error deteniendo listener:', error);
  }
}

/**
 * Procesa eventos históricos
 */
async function processHistoricalEvents(fromBlock = 0) {
  try {
    console.log(`📚 Procesando eventos históricos desde el bloque ${fromBlock}...`);
    
    const events = await contract.queryFilter("PaymentSent", fromBlock, "latest");
    
    console.log(`📊 Encontrados ${events.length} eventos históricos`);
    
    for (const event of events) {
      const { from, to, amount } = event.args;
      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;
      const timestamp = Math.floor(Date.now() / 1000);

      // Verificar si la transacción ya existe
      const existing = await pool.query(
        'SELECT id FROM transactions WHERE tx_hash = $1',
        [txHash]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO transactions (
            sender, 
            receiver, 
            amount, 
            tx_hash, 
            block_number, 
            timestamp,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            from.toLowerCase(), 
            to.toLowerCase(), 
            amount.toString(), 
            txHash,
            blockNumber,
            timestamp,
            'confirmed'
          ]
        );
        console.log(`✅ Evento histórico procesado: ${txHash}`);
      } else {
        console.log(`⏭️ Evento ya existe: ${txHash}`);
      }
    }
    
    console.log('✅ Procesamiento de eventos históricos completado');
    
  } catch (error) {
    console.error('❌ Error procesando eventos históricos:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de transacciones
 */
async function getTransactionStats() {
  try {
    const result = await pool.query('SELECT * FROM get_transaction_stats()');
    return result.rows[0];
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Obtiene transacciones recientes
 */
async function getRecentTransactions(limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        sender,
        receiver,
        amount,
        tx_hash,
        block_number,
        to_timestamp(timestamp) as transaction_time,
        status,
        created_at
      FROM transactions 
      ORDER BY timestamp DESC 
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo transacciones recientes:', error);
    throw error;
  }
}

/**
 * Obtiene transacciones por dirección
 */
async function getTransactionsByAddress(address, limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        sender,
        receiver,
        amount,
        tx_hash,
        block_number,
        to_timestamp(timestamp) as transaction_time,
        status,
        created_at
      FROM transactions 
      WHERE sender = $1 OR receiver = $1
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3`,
      [address.toLowerCase(), limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo transacciones por dirección:', error);
    throw error;
  }
}

/**
 * Verifica el estado de la conexión blockchain
 */
async function checkBlockchainConnection() {
  try {
    const address = await contract.getAddress();
    const blockNumber = await provider.getBlockNumber();
    
    return {
      connected: true,
      contractAddress: address,
      currentBlock: blockNumber,
      network: await provider.getNetwork()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando conexiones blockchain...');
  await stopListening();
  await pool.end();
  console.log('👋 Conexiones cerradas');
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando conexiones blockchain...');
  await stopListening();
  await pool.end();
  console.log('👋 Conexiones cerradas');
});

module.exports = {
  listenPayments,
  stopListening,
  processHistoricalEvents,
  processEvent,
  updateSyncState,
  getSyncState,
  markTransactionOrphaned,
  getTransactionStats,
  getRecentTransactions,
  getTransactionsByAddress,
  checkBlockchainConnection,
  isListening: () => isListening,
  isProcessing: () => isProcessing
};
