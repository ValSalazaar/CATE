const { ethers } = require('ethers');
const { Pool } = require('pg');

const pool = new Pool(); // Config en .env
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contractAddress = process.env.CATE_PAYMENTS_ADDRESS;
const abi = [
  "event PaymentSent(address indexed from, address indexed to, uint256 amount)"
];

const contract = new ethers.Contract(contractAddress, abi, provider);

let isListening = false;

async function listenPayments() {
  if (isListening) {
    console.log('Ya está escuchando eventos de pago');
    return;
  }

  try {
    console.log('Iniciando listener de pagos...');
    console.log(`Contrato: ${contractAddress}`);
    console.log(`Red: ${process.env.POLYGON_RPC_URL}`);

    contract.on("PaymentSent", async (from, to, amount, event) => {
      try {
        const txHash = event.transactionHash;
        const blockNumber = event.blockNumber;
        const timestamp = Math.floor(Date.now() / 1000);

        console.log(`💰 Pago detectado:`);
        console.log(`   De: ${from}`);
        console.log(`   Para: ${to}`);
        console.log(`   Cantidad: ${ethers.formatUnits(amount, 6)} USDC`); // Assuming 6 decimals for USDC
        console.log(`   TX Hash: ${txHash}`);
        console.log(`   Block: ${blockNumber}`);

        // Insert into database
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

        console.log('✅ Transacción guardada en la base de datos');

      } catch (error) {
        console.error('❌ Error procesando evento de pago:', error);
        
        // Log error to database
        try {
          await pool.query(
            `INSERT INTO error_logs (error_message, event_data, timestamp) VALUES ($1, $2, $3)`,
            [
              error.message,
              JSON.stringify({ from, to, amount: amount.toString() }),
              Math.floor(Date.now() / 1000)
            ]
          );
        } catch (dbError) {
          console.error('Error guardando log de error:', dbError);
        }
      }
    });

    // Handle connection errors
    contract.on("error", (error) => {
      console.error('❌ Error en la conexión del contrato:', error);
      isListening = false;
    });

    isListening = true;
    console.log('✅ Listener de pagos iniciado correctamente');

  } catch (error) {
    console.error('❌ Error iniciando listener:', error);
    throw error;
  }
}

async function stopListening() {
  try {
    contract.removeAllListeners();
    isListening = false;
    console.log('🛑 Listener de pagos detenido');
  } catch (error) {
    console.error('Error deteniendo listener:', error);
  }
}

// Process historical events
async function processHistoricalEvents(fromBlock = 0) {
  try {
    console.log(`Procesando eventos históricos desde el bloque ${fromBlock}...`);
    
    const events = await contract.queryFilter("PaymentSent", fromBlock, "latest");
    
    console.log(`Encontrados ${events.length} eventos históricos`);
    
    for (const event of events) {
      const { from, to, amount } = event.args;
      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;
      const timestamp = Math.floor(Date.now() / 1000);

      // Check if transaction already exists
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

module.exports = { 
  listenPayments, 
  stopListening, 
  processHistoricalEvents,
  isListening: () => isListening
};
