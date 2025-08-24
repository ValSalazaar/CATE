const { Server } = require('socket.io');
const jwtService = require('./jwt');
const { Pool } = require('pg');
const Redis = require('ioredis');
const pino = require('pino');

const pool = new Pool();
const redis = new Redis(require('../config/security').redisConfig);

// Structured logging
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

class WebSocketService {
  constructor() {
    this.io = null;
    this.connections = new Map();
    this.roomStats = new Map();
    this.eventHandlers = new Map();
    this.rateLimiters = new Map();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server, options = {}) {
    const { wsSecurityConfig } = require('../config/security');
    
    this.io = new Server(server, {
      ...wsSecurityConfig,
      ...options,
      // Enhanced security options
      transports: ['websocket', 'polling'],
      allowEIO3: false, // Disable Engine.IO v3 for security
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Setup middleware
    this.setupMiddleware();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Setup monitoring
    this.setupMonitoring();
    
    logger.info('WebSocket server initialized');
    
    return this.io;
  }

  /**
   * Setup WebSocket middleware
   */
  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const startTime = Date.now();
        
        // Get token from auth or headers
        const token = socket.handshake.auth?.token || 
                     socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          logger.warn({ socketId: socket.id, ip: socket.handshake.address }, 'No token provided');
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const { payload } = await jwtService.verify(token);
        
        // Get user details from database
        const user = await this.getUserWithOrganizations(payload.sub);
        if (!user) {
          logger.warn({ socketId: socket.id, userId: payload.sub }, 'User not found');
          return next(new Error('User not found'));
        }

        // Rate limiting check
        const rateLimitKey = `ws:rate:${user.id}`;
        const currentCount = await redis.incr(rateLimitKey);
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, 60); // 1 minute window
        }
        
        if (currentCount > 30) { // 30 connections per minute
          logger.warn({ socketId: socket.id, userId: user.id }, 'Rate limit exceeded');
          return next(new Error('Rate limit exceeded'));
        }

        // Attach user context to socket
        socket.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          organizations: user.organizations
        };

        // Join organization rooms
        for (const org of user.organizations) {
          socket.join(`org:${org.id}`);
          this.updateRoomStats(`org:${org.id}`, 'join');
        }

        // Store connection info
        this.connections.set(socket.id, {
          userId: user.id,
          email: user.email,
          organizations: user.organizations.map(org => org.id),
          connectedAt: new Date(),
          ip: socket.handshake.address
        });

        const latency = Date.now() - startTime;
        logger.info({
          socketId: socket.id,
          userId: user.id,
          email: user.email,
          organizations: user.organizations.map(org => org.id),
          latency,
          ip: socket.handshake.address
        }, 'WebSocket connection established');

        next();
        
      } catch (error) {
        logger.error({ 
          socketId: socket.id, 
          error: error.message,
          ip: socket.handshake.address 
        }, 'WebSocket authentication failed');
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      logger.info({
        socketId: socket.id,
        userId: socket.user.id,
        organizations: socket.user.organizations.map(org => org.id)
      }, 'Client connected');

      // Disconnection handler
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error({
          socketId: socket.id,
          userId: socket.user?.id,
          error: error.message
        }, 'WebSocket error');
      });
    });
  }

  /**
   * Setup event handlers with authorization
   */
  setupEventHandlers() {
    // Certificate events
    this.io.on('connection', (socket) => {
      // Issue certificate (requires ISSUER role)
      socket.on('certificate:issue', async (data) => {
        try {
          const startTime = Date.now();
          
          // Authorization check
          if (!this.hasRole(socket, 'ISSUER')) {
            throw new Error('Insufficient permissions');
          }

          // Organization access check
          if (!this.hasOrganizationAccess(socket, data.orgId)) {
            throw new Error('Organization access denied');
          }

          // Rate limiting for certificate operations
          const rateLimitKey = `cert:issue:${socket.user.id}`;
          const currentCount = await redis.incr(rateLimitKey);
          if (currentCount === 1) {
            await redis.expire(rateLimitKey, 60); // 1 minute window
          }
          
          if (currentCount > 10) { // 10 certificate issues per minute
            throw new Error('Certificate issuance rate limit exceeded');
          }

          // Process certificate issuance
          const result = await this.processCertificateIssuance(socket, data);
          
          // Emit to organization room
          this.io.to(`org:${data.orgId}`).emit('certificate:issued', {
            ...result,
            issuedBy: socket.user.id,
            issuedAt: new Date().toISOString()
          });

          const latency = Date.now() - startTime;
          logger.info({
            event: 'certificate:issue',
            socketId: socket.id,
            userId: socket.user.id,
            orgId: data.orgId,
            latency,
            success: true
          }, 'Certificate issued successfully');

        } catch (error) {
          logger.error({
            event: 'certificate:issue',
            socketId: socket.id,
            userId: socket.user?.id,
            error: error.message
          }, 'Certificate issuance failed');

          socket.emit('error', {
            event: 'certificate:issue',
            error: error.message
          });
        }
      });

      // Verify certificate (public event)
      socket.on('certificate:verify', async (data) => {
        try {
          const startTime = Date.now();
          
          // Rate limiting for verification
          const rateLimitKey = `cert:verify:${socket.handshake.address}`;
          const currentCount = await redis.incr(rateLimitKey);
          if (currentCount === 1) {
            await redis.expire(rateLimitKey, 60);
          }
          
          if (currentCount > 50) { // 50 verifications per minute per IP
            throw new Error('Certificate verification rate limit exceeded');
          }

          // Process certificate verification
          const result = await this.processCertificateVerification(data);
          
          // Emit result back to client
          socket.emit('certificate:verified', result);

          const latency = Date.now() - startTime;
          logger.info({
            event: 'certificate:verify',
            socketId: socket.id,
            userId: socket.user?.id,
            latency,
            success: true
          }, 'Certificate verified');

        } catch (error) {
          logger.error({
            event: 'certificate:verify',
            socketId: socket.id,
            userId: socket.user?.id,
            error: error.message
          }, 'Certificate verification failed');

          socket.emit('error', {
            event: 'certificate:verify',
            error: error.message
          });
        }
      });

      // Join specific room (with authorization)
      socket.on('join:room', async (data) => {
        try {
          const { room, orgId } = data;
          
          // Validate room format
          if (!room.startsWith('org:') && !room.startsWith('public:')) {
            throw new Error('Invalid room format');
          }

          // Check organization access for org rooms
          if (room.startsWith('org:') && !this.hasOrganizationAccess(socket, orgId)) {
            throw new Error('Organization access denied');
          }

          socket.join(room);
          this.updateRoomStats(room, 'join');

          logger.info({
            event: 'join:room',
            socketId: socket.id,
            userId: socket.user.id,
            room,
            orgId
          }, 'Client joined room');

          socket.emit('room:joined', { room });

        } catch (error) {
          logger.error({
            event: 'join:room',
            socketId: socket.id,
            userId: socket.user?.id,
            error: error.message
          }, 'Failed to join room');

          socket.emit('error', {
            event: 'join:room',
            error: error.message
          });
        }
      });

      // Leave room
      socket.on('leave:room', (data) => {
        const { room } = data;
        socket.leave(room);
        this.updateRoomStats(room, 'leave');

        logger.info({
          event: 'leave:room',
          socketId: socket.id,
          userId: socket.user.id,
          room
        }, 'Client left room');

        socket.emit('room:left', { room });
      });
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(socket, reason) {
    // Remove from connections map
    const connection = this.connections.get(socket.id);
    if (connection) {
      // Update room stats
      for (const orgId of connection.organizations) {
        this.updateRoomStats(`org:${orgId}`, 'leave');
      }
      
      this.connections.delete(socket.id);
    }

    logger.info({
      socketId: socket.id,
      userId: socket.user?.id,
      reason,
      duration: connection ? Date.now() - connection.connectedAt.getTime() : 0
    }, 'Client disconnected');
  }

  /**
   * Check if user has required role
   */
  hasRole(socket, requiredRole) {
    if (!socket.user) return false;
    
    return socket.user.organizations.some(org => 
      org.role === requiredRole || org.role === 'ORG_ADMIN'
    );
  }

  /**
   * Check if user has access to organization
   */
  hasOrganizationAccess(socket, orgId) {
    if (!socket.user) return false;
    
    return socket.user.organizations.some(org => org.id === orgId);
  }

  /**
   * Get user with organizations from database
   */
  async getUserWithOrganizations(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.name, u.role,
          json_agg(
            json_build_object(
              'id', o.id,
              'name', o.name,
              'slug', o.slug,
              'role', m.role
            )
          ) as organizations
        FROM users u
        LEFT JOIN memberships m ON u.id = m.user_id
        LEFT JOIN organizations o ON m.organization_id = o.id
        WHERE u.id = $1 AND m.status = 'ACTIVE'
        GROUP BY u.id, u.email, u.name, u.role
      `, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      user.organizations = user.organizations.filter(org => org.id !== null);
      
      return user;
      
    } catch (error) {
      logger.error({ userId, error: error.message }, 'Failed to get user with organizations');
      throw error;
    }
  }

  /**
   * Process certificate issuance
   */
  async processCertificateIssuance(socket, data) {
    // This would integrate with the certificate service
    const certificateService = require('./certificates');
    
    const result = await certificateService.issueCertificate(
      data.certData,
      data.issuerWallet,
      data.metadata
    );

    return result;
  }

  /**
   * Process certificate verification
   */
  async processCertificateVerification(data) {
    // This would integrate with the certificate service
    const certificateService = require('./certificates');
    
    const result = await certificateService.verifyCertificate(
      data.certificateFile,
      socket.handshake.address
    );

    return result;
  }

  /**
   * Update room statistics
   */
  updateRoomStats(room, action) {
    if (!this.roomStats.has(room)) {
      this.roomStats.set(room, { connections: 0, events: 0 });
    }

    const stats = this.roomStats.get(room);
    
    if (action === 'join') {
      stats.connections++;
    } else if (action === 'leave') {
      stats.connections = Math.max(0, stats.connections - 1);
    } else if (action === 'event') {
      stats.events++;
    }
  }

  /**
   * Setup monitoring and metrics
   */
  setupMonitoring() {
    // Periodic stats logging
    setInterval(() => {
      const stats = {
        totalConnections: this.connections.size,
        roomStats: Object.fromEntries(this.roomStats),
        timestamp: new Date().toISOString()
      };

      logger.info(stats, 'WebSocket statistics');
      
      // Store in Redis for external monitoring
      redis.setex('ws:stats', 300, JSON.stringify(stats)); // 5 minutes
      
    }, 60000); // Every minute

    // Clean up stale connections
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, connection] of this.connections.entries()) {
        const age = now - connection.connectedAt.getTime();
        if (age > 24 * 60 * 60 * 1000) { // 24 hours
          logger.warn({ socketId, age }, 'Stale connection detected');
          this.connections.delete(socketId);
        }
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Emit event to organization room
   */
  emitToOrganization(orgId, event, data) {
    this.io.to(`org:${orgId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info({
      event,
      orgId,
      dataSize: JSON.stringify(data).length
    }, 'Event emitted to organization');
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info({
      event,
      room,
      dataSize: JSON.stringify(data).length
    }, 'Event emitted to room');
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      roomStats: Object.fromEntries(this.roomStats),
      connections: Array.from(this.connections.values()).map(conn => ({
        userId: conn.userId,
        email: conn.email,
        organizations: conn.organizations,
        connectedAt: conn.connectedAt,
        ip: conn.ip
      }))
    };
  }

  /**
   * Disconnect user from all sessions
   */
  async disconnectUser(userId, reason = 'admin_action') {
    const userSockets = [];
    
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.userId === userId) {
        userSockets.push(socketId);
      }
    }

    for (const socketId of userSockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }

    logger.info({
      userId,
      disconnectedSockets: userSockets.length,
      reason
    }, 'User disconnected from all sessions');

    return userSockets.length;
  }
}

module.exports = new WebSocketService();
