# CATE - Security Implementation Guide

Guía completa de implementación de seguridad para la aplicación CATE, incluyendo HTTPS/WSS, CORS, JWT con rotación, y WebSocket seguro.

## 🛡️ Arquitectura de Seguridad

### **1. Transporte Seguro (HTTPS/WSS)**

#### **Configuración NGINX**
```nginx
# /etc/nginx/sites-available/cate
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream cate_backend {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name cate.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cate.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/cate.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cate.example.com/privkey.pem;
    
    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Routes
    location /api/ {
        proxy_pass http://cate_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://cate_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files
    location / {
        root /var/www/cate-frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

#### **Configuración Cloudflare**
```javascript
// cloudflare-workers/cate-security.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Security headers
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: ws:;"
  }

  // Add headers to response
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })
  
  return newResponse
}
```

### **2. Configuración CORS**

#### **Backend Configuration**
```javascript
// config/security.js
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400
};
```

#### **Environment Variables**
```env
# Production
CORS_ORIGIN=https://cate.example.com,https://admin.cate.example.com

# Development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### **3. JWT con Rotación de Claves**

#### **Configuración del Servicio JWT**
```javascript
// services/jwt.js
class JWTService {
  constructor() {
    this.keys = new Map();
    this.currentKid = null;
    this.initializeKeys();
    this.scheduleKeyRotation();
  }

  async initializeKeys() {
    // Generate RS256 key pair
    const keyPair = await generateKeyPair('RS256');
    const kid = crypto.randomBytes(16).toString('hex');
    
    this.keys.set(kid, {
      privateKey: keyPair.privateKey,
      publicKey: await exportJWK(keyPair.publicKey),
      createdAt: new Date()
    });
    
    this.currentKid = kid;
  }

  scheduleKeyRotation() {
    // Rotate keys every 30 days
    setInterval(() => this.rotateKeys(), 30 * 24 * 60 * 60 * 1000);
  }
}
```

#### **JWKS Endpoint**
```javascript
// routes/auth.js
router.get('/.well-known/jwks.json', async (req, res) => {
  try {
    const jwks = await jwtService.getJWKS();
    res.json(jwks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate JWKS' });
  }
});
```

#### **Token Configuration**
```javascript
const jwtConfig = {
  accessToken: {
    expiresIn: '15m',
    algorithm: 'RS256',
    issuer: 'cate',
    audience: 'cate-api'
  },
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'RS256',
    issuer: 'cate',
    audience: 'cate-refresh'
  }
};
```

### **4. WebSocket Seguro con Multi-Organización**

#### **Autenticación y Autorización**
```javascript
// services/websocket.js
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || 
                 socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT with key rotation support
    const { payload } = await jwtService.verify(token);
    
    // Get user with organizations
    const user = await getUserWithOrganizations(payload.sub);
    
    // Rate limiting
    const rateLimitKey = `ws:rate:${user.id}`;
    const currentCount = await redis.incr(rateLimitKey);
    if (currentCount > 30) {
      return next(new Error('Rate limit exceeded'));
    }

    // Attach user context
    socket.user = {
      id: user.id,
      email: user.email,
      organizations: user.organizations
    };

    // Join organization rooms
    for (const org of user.organizations) {
      socket.join(`org:${org.id}`);
    }

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

#### **Event Authorization**
```javascript
// Event handlers with role-based access
socket.on('certificate:issue', async (data) => {
  // Check role
  if (!hasRole(socket, 'ISSUER')) {
    throw new Error('Insufficient permissions');
  }

  // Check organization access
  if (!hasOrganizationAccess(socket, data.orgId)) {
    throw new Error('Organization access denied');
  }

  // Rate limiting
  const rateLimitKey = `cert:issue:${socket.user.id}`;
  const currentCount = await redis.incr(rateLimitKey);
  if (currentCount > 10) {
    throw new Error('Rate limit exceeded');
  }

  // Process certificate issuance
  const result = await processCertificateIssuance(socket, data);
  
  // Emit to organization room
  io.to(`org:${data.orgId}`).emit('certificate:issued', result);
});
```

### **5. Rate Limiting**

#### **API Rate Limiting**
```javascript
// config/security.js
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
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

// Specific limiters
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'API rate limit exceeded');
const certIssueLimiter = createRateLimiter(60 * 1000, 10, 'Certificate issuance rate limit exceeded');
```

#### **WebSocket Rate Limiting**
```javascript
// Redis-based rate limiting for WebSocket connections
const wsRateLimit = new Map();

io.use((socket, next) => {
  const clientId = socket.handshake.address;
  const now = Date.now();
  const windowMs = 60 * 1000;
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
```

### **6. Monitoreo y Observabilidad**

#### **Structured Logging**
```javascript
// services/websocket.js
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

// Log WebSocket events
logger.info({
  event: 'certificate:issue',
  socketId: socket.id,
  userId: socket.user.id,
  orgId: data.orgId,
  latency: Date.now() - startTime,
  success: true
}, 'Certificate issued successfully');
```

#### **Metrics Collection**
```javascript
// Prometheus metrics
const client = require('prom-client');

const wsConnections = new client.Gauge({
  name: 'ws_connections',
  help: 'Active WebSocket connections',
  labelNames: ['room', 'org']
});

const wsEvents = new client.Counter({
  name: 'ws_events_total',
  help: 'Total WebSocket events',
  labelNames: ['event', 'room', 'org']
});

// Update metrics
function updateMetrics(room, org, event) {
  wsConnections.inc({ room, org });
  wsEvents.inc({ event, room, org });
}
```

### **7. Configuración de Entorno**

#### **Production Environment**
```env
# Security
NODE_ENV=production
CORS_ORIGIN=https://cate.example.com,https://admin.cate.example.com
FORCE_HTTPS=true
TRUST_PROXY=true

# JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_MAX_PAYLOAD=10485760
WS_CONNECT_TIMEOUT=30000
WS_PING_TIMEOUT=25000
WS_PING_INTERVAL=10000
```

#### **Development Environment**
```env
# Security
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
FORCE_HTTPS=false
TRUST_PROXY=false

# JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=debug
```

### **8. Deployment Security**

#### **Docker Security**
```dockerfile
# Dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["npm", "start"]
```

#### **Kubernetes Security**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cate-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cate-backend
  template:
    metadata:
      labels:
        app: cate-backend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: cate-backend
        image: cate/backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          valueFrom:
            secretKeyRef:
              name: cate-secrets
              key: redis-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### **9. Testing de Seguridad**

#### **Security Tests**
```javascript
// tests/security.test.js
const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  test('should enforce HTTPS in production', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app)
      .get('/api/health')
      .set('X-Forwarded-Proto', 'http');
    
    expect(response.status).toBe(301);
    expect(response.headers.location).toMatch(/^https:/);
  });

  test('should block unauthorized CORS origins', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious-site.com');
    
    expect(response.status).toBe(403);
  });

  test('should enforce rate limiting', async () => {
    const requests = Array(6).fill().map(() => 
      request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'password'
      })
    );
    
    const responses = await Promise.all(requests);
    const blockedRequests = responses.filter(r => r.status === 429);
    
    expect(blockedRequests.length).toBeGreaterThan(0);
  });

  test('should validate JWT tokens', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });
});
```

### **10. Incident Response**

#### **Security Incident Playbook**
```markdown
# Security Incident Response

## 1. Detection
- Monitor logs for suspicious activity
- Set up alerts for failed authentication attempts
- Monitor rate limiting violations

## 2. Assessment
- Determine scope of incident
- Identify affected users/organizations
- Assess data exposure

## 3. Response
- Revoke compromised tokens
- Rotate JWT keys if necessary
- Disconnect suspicious WebSocket connections
- Update rate limiting rules

## 4. Recovery
- Restore from backup if necessary
- Update security configurations
- Notify affected users

## 5. Post-Incident
- Document incident details
- Update security measures
- Conduct security review
```

## 🔧 Implementación

### **1. Instalación de Dependencias**
```bash
npm install helmet express-rate-limit hpp compression
npm install jose ioredis pino
npm install --save-dev @types/express-rate-limit
```

### **2. Configuración Inicial**
```bash
# Generate JWT keys
node -e "
const { generateKeyPair } = require('jose');
generateKeyPair('RS256').then(console.log);
"

# Setup Redis
redis-cli config set requirepass "your_redis_password"

# Setup SSL certificates
certbot --nginx -d cate.example.com
```

### **3. Monitoreo Continuo**
```bash
# Monitor logs
tail -f logs/application.log | grep -E "(ERROR|WARN|SECURITY)"

# Monitor Redis
redis-cli monitor | grep -E "(jwt|ws|rate)"

# Monitor WebSocket connections
curl -s http://localhost:4000/metrics | grep ws_
```

## 📊 Métricas de Seguridad

### **Key Performance Indicators**
- **Authentication Success Rate**: > 95%
- **Rate Limiting Violations**: < 1%
- **JWT Token Revocation Rate**: < 0.1%
- **WebSocket Connection Success Rate**: > 98%
- **CORS Violation Rate**: < 0.01%

### **Security Metrics Dashboard**
```javascript
// Grafana dashboard configuration
{
  "dashboard": {
    "title": "CATE Security Metrics",
    "panels": [
      {
        "title": "Authentication Attempts",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(auth_attempts_total[5m])",
            "legendFormat": "{{method}}"
          }
        ]
      },
      {
        "title": "Rate Limiting Violations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(rate_limit_violations_total[5m])",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "ws_connections",
            "legendFormat": "Active Connections"
          }
        ]
      }
    ]
  }
}
```

Esta implementación proporciona una base sólida de seguridad para la aplicación CATE, con protección contra ataques comunes, monitoreo continuo y capacidad de respuesta a incidentes.
