const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials for authenticated requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Rate Limiting Configuration
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Specific rate limiters
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'API rate limit exceeded');
const wsLimiter = createRateLimiter(60 * 1000, 30, 'WebSocket rate limit exceeded');

// Helmet Configuration for Security Headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// JWT Configuration
const jwtConfig = {
  // Access token: 15 minutes
  accessToken: {
    expiresIn: '15m',
    algorithm: 'RS256',
    issuer: 'cate',
    audience: 'cate-api'
  },
  // Refresh token: 7 days
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'RS256',
    issuer: 'cate',
    audience: 'cate-refresh'
  },
  // Certificate token: 1 hour (for certificate operations)
  certificateToken: {
    expiresIn: '1h',
    algorithm: 'RS256',
    issuer: 'cate',
    audience: 'cate-certificates'
  }
};

// WebSocket Security Configuration
const wsSecurityConfig = {
  // Maximum payload size (10MB)
  maxPayload: 10 * 1024 * 1024,
  // Connection timeout (30 seconds)
  connectTimeout: 30000,
  // Ping timeout (25 seconds)
  pingTimeout: 25000,
  // Ping interval (10 seconds)
  pingInterval: 10000,
  // Upgrade timeout (10 seconds)
  upgradeTimeout: 10000,
  // Allow upgrade requests
  allowUpgrades: true,
  // CORS for WebSocket
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [],
    methods: ["GET", "POST"],
    credentials: true
  }
};

// Redis Configuration for JWT Blacklisting
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true
};

// Certificate Security Configuration
const certificateSecurityConfig = {
  // Maximum file size for certificate uploads (10MB)
  maxFileSize: 10 * 1024 * 1024,
  // Allowed file types
  allowedFileTypes: ['.catecert', '.json'],
  // Hash algorithm
  hashAlgorithm: 'sha256',
  // Certificate verification timeout (30 seconds)
  verificationTimeout: 30000,
  // Rate limiting for certificate operations
  rateLimit: {
    issue: createRateLimiter(60 * 1000, 10, 'Certificate issuance rate limit exceeded'),
    verify: createRateLimiter(60 * 1000, 50, 'Certificate verification rate limit exceeded')
  }
};

// Environment-specific configurations
const getEnvironmentConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    isProduction,
    isDevelopment,
    // Force HTTPS in production
    forceHttps: isProduction,
    // Enable detailed logging in development
    detailedLogging: isDevelopment,
    // Trust proxy in production (for load balancers)
    trustProxy: isProduction,
    // Compression settings
    compression: {
      enabled: true,
      threshold: 1024,
      level: 6
    }
  };
};

// Security middleware setup
const setupSecurityMiddleware = (app) => {
  const env = getEnvironmentConfig();
  
  // Trust proxy for load balancers
  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }
  
  // Security headers
  app.use(helmet(helmetConfig));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Body parsing security
  app.use(hpp()); // Protect against HTTP Parameter Pollution
  
  // Rate limiting
  app.use('/auth', authLimiter);
  app.use('/api', apiLimiter);
  app.use('/certificates', certificateSecurityConfig.rateLimit.issue);
  app.use('/certificates/verify', certificateSecurityConfig.rateLimit.verify);
  
  // Force HTTPS in production
  if (env.forceHttps) {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
  
  return app;
};

// WebSocket security setup
const setupWebSocketSecurity = (io) => {
  // Rate limiting for WebSocket connections
  const wsRateLimit = new Map();
  
  io.use((socket, next) => {
    const clientId = socket.handshake.address;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxConnections = 5;
    
    if (!wsRateLimit.has(clientId)) {
      wsRateLimit.set(clientId, { count: 1, resetTime: now + windowMs });
    } else {
      const limit = wsRateLimit.get(clientId);
      if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + windowMs;
      } else if (limit.count >= maxConnections) {
        return next(new Error('WebSocket rate limit exceeded'));
      } else {
        limit.count++;
      }
    }
    
    next();
  });
  
  // Clean up rate limit map periodically
  setInterval(() => {
    const now = Date.now();
    for (const [clientId, limit] of wsRateLimit.entries()) {
      if (now > limit.resetTime) {
        wsRateLimit.delete(clientId);
      }
    }
  }, 60000); // Clean up every minute
  
  return io;
};

module.exports = {
  corsOptions,
  jwtConfig,
  wsSecurityConfig,
  redisConfig,
  certificateSecurityConfig,
  setupSecurityMiddleware,
  setupWebSocketSecurity,
  createRateLimiter,
  getEnvironmentConfig
};
