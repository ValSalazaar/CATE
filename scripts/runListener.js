require('dotenv').config();
const { listenPayments, stopListening, processHistoricalEvents } = require('../listeners/paymentListenerEnhanced');

async function main() {
  console.log('🚀 Iniciando CATE Payments Listener...');
  
  try {
    // Check required environment variables
    const requiredEnvVars = [
      'POLYGON_RPC_URL',
      'CATE_PAYMENTS_ADDRESS',
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Environment variables loaded');
    console.log(`📡 RPC URL: ${process.env.POLYGON_RPC_URL}`);
    console.log(`📄 Contract: ${process.env.CATE_PAYMENTS_ADDRESS}`);

    // Process historical events if requested
    if (process.argv.includes('--historical')) {
      const fromBlock = process.argv.includes('--from-block') 
        ? parseInt(process.argv[process.argv.indexOf('--from-block') + 1])
        : 0;
      
      await processHistoricalEvents(fromBlock);
    }

    // Start listening for new events
    await listenPayments();

    console.log('🎧 Listener activo. Presiona Ctrl+C para detener.');

  } catch (error) {
    console.error('❌ Error iniciando listener:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Recibida señal de interrupción...');
  await stopListening();
  console.log('👋 Listener detenido. Adiós!');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recibida señal de terminación...');
  await stopListening();
  console.log('👋 Listener detenido. Adiós!');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Start the listener
main();
