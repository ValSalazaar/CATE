// server.js
import express from "express";
import cors from "cors";
import { config, validateConfig } from "./config/env.js";
import { testConnection, initDatabase, healthCheck } from "./db/index.js";
import { checkContractHealth } from "./blockchain/contract.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { apiRateLimit, webhookRateLimit, kycStartRateLimit, vcIssuanceRateLimit } from "./middleware/rateLimit.js";
import { requestLogger, logEvent, EVENTS } from "./utils/logger.js";
import { setupMetrics } from "./utils/metrics.js";
import vcRoutes from "./api/vc.routes.js";
import kycRoutes from "./api/kyc.routes.js";
import debugRoutes from "./api/debug.routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
app.use(apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Setup metrics (if enabled)
if (process.env.METRICS_ENABLED === 'true') {
  setupMetrics(app);
}

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const contractStatus = await checkContractHealth();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      blockchain: contractStatus,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes with rate limiting
app.use("/api/vc", vcIssuanceRateLimit, vcRoutes);
app.use("/api/kyc", kycStartRateLimit, kycRoutes);

// Debug routes (only in staging/development)
if (process.env.NODE_ENV !== 'production') {
  app.use("/api/debug", debugRoutes);
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "CATE Verifiable Credentials API",
    version: "1.0.0",
    description: "API para gestión de credenciales verificables con KYC",
    endpoints: {
      health: "/health",
      vc: "/api/vc",
      kyc: "/api/kyc"
    },
    documentation: "https://github.com/your-repo/docs"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logEvent(EVENTS.ERROR, {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    requestId: req.requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
});

// Initialize server
async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    // Initialize database tables
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      throw new Error('Database initialization failed');
    }
    
    // Test blockchain connection
    const contractStatus = await checkContractHealth();
    if (contractStatus.status === 'unhealthy') {
      console.warn('⚠️  Blockchain connection failed:', contractStatus.error);
    } else {
      console.log('✅ Blockchain connected:', contractStatus);
    }
    
    // Start server
    const port = config.server.port;
    app.listen(port, () => {
      logEvent(EVENTS.SERVER_STARTED, {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 CATE Verifiable Credentials API listening on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🔗 API docs: http://localhost:${port}/`);
      if (process.env.METRICS_ENABLED === 'true') {
        console.log(`📈 Metrics: http://localhost:${port}/metrics`);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🐛 Debug endpoints: http://localhost:${port}/api/debug`);
      }
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
