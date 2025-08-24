const { SignJWT, jwtVerify, generateKeyPair, exportJWK, importJWK } = require('jose');
const crypto = require('crypto');
const Redis = require('ioredis');

class JWTService {
  constructor() {
    this.redis = new Redis(require('../config/security').redisConfig);
    this.keys = new Map();
    this.currentKid = null;
    this.initializeKeys();
  }

  /**
   * Initialize JWT keys with rotation support
   */
  async initializeKeys() {
    try {
      // Generate current key pair
      const currentKeyPair = await generateKeyPair('RS256');
      const currentKid = crypto.randomBytes(16).toString('hex');
      
      // Export public key as JWK
      const publicKey = await exportJWK(currentKeyPair.publicKey);
      publicKey.kid = currentKid;
      publicKey.use = 'sig';
      publicKey.alg = 'RS256';
      
      // Store keys
      this.keys.set(currentKid, {
        privateKey: currentKeyPair.privateKey,
        publicKey: publicKey,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      });
      
      this.currentKid = currentKid;
      
      // Store in Redis for multi-instance support
      await this.redis.setex(`jwt:key:${currentKid}`, 90 * 24 * 60 * 60, JSON.stringify(publicKey));
      
      console.log(`🔑 JWT key initialized with kid: ${currentKid}`);
      
      // Schedule key rotation
      this.scheduleKeyRotation();
      
    } catch (error) {
      console.error('Failed to initialize JWT keys:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic key rotation
   */
  scheduleKeyRotation() {
    // Rotate keys every 30 days
    setInterval(async () => {
      await this.rotateKeys();
    }, 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Rotate JWT keys
   */
  async rotateKeys() {
    try {
      console.log('🔄 Rotating JWT keys...');
      
      // Generate new key pair
      const newKeyPair = await generateKeyPair('RS256');
      const newKid = crypto.randomBytes(16).toString('hex');
      
      // Export public key as JWK
      const publicKey = await exportJWK(newKeyPair.publicKey);
      publicKey.kid = newKid;
      publicKey.use = 'sig';
      publicKey.alg = 'RS256';
      
      // Store new key
      this.keys.set(newKid, {
        privateKey: newKeyPair.privateKey,
        publicKey: publicKey,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });
      
      // Update current key
      this.currentKid = newKid;
      
      // Store in Redis
      await this.redis.setex(`jwt:key:${newKid}`, 90 * 24 * 60 * 60, JSON.stringify(publicKey));
      
      // Clean up old keys (keep previous for grace period)
      await this.cleanupOldKeys();
      
      console.log(`✅ JWT keys rotated. New kid: ${newKid}`);
      
    } catch (error) {
      console.error('Failed to rotate JWT keys:', error);
    }
  }

  /**
   * Clean up old keys
   */
  async cleanupOldKeys() {
    const now = new Date();
    const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [kid, key] of this.keys.entries()) {
      if (kid !== this.currentKid && (now - key.createdAt) > gracePeriod) {
        this.keys.delete(kid);
        await this.redis.del(`jwt:key:${kid}`);
        console.log(`🗑️ Removed old JWT key: ${kid}`);
      }
    }
  }

  /**
   * Get current signing key
   */
  async getCurrentSigningKey() {
    const key = this.keys.get(this.currentKid);
    if (!key) {
      throw new Error('No current signing key available');
    }
    return {
      privateKey: key.privateKey,
      kid: this.currentKid
    };
  }

  /**
   * Resolve verification key by kid
   */
  async resolveVerificationKey(token) {
    try {
      // Decode token header to get kid
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      const kid = header.kid;
      
      if (!kid) {
        throw new Error('No key ID in token');
      }
      
      // Try to get key from memory first
      let key = this.keys.get(kid);
      
      if (!key) {
        // Try to get from Redis (for multi-instance)
        const keyData = await this.redis.get(`jwt:key:${kid}`);
        if (keyData) {
          const publicKey = await importJWK(JSON.parse(keyData));
          key = { publicKey };
        }
      }
      
      if (!key) {
        throw new Error('Key not found');
      }
      
      return {
        key: key.publicKey,
        kid: kid
      };
      
    } catch (error) {
      throw new Error('Failed to resolve verification key: ' + error.message);
    }
  }

  /**
   * Sign JWT token
   */
  async sign(payload, options = {}) {
    try {
      const { privateKey, kid } = await this.getCurrentSigningKey();
      
      const jwt = new SignJWT(payload)
        .setProtectedHeader({ 
          alg: 'RS256', 
          kid: kid,
          typ: 'JWT'
        })
        .setIssuedAt()
        .setIssuer(options.issuer || 'cate')
        .setAudience(options.audience || 'cate-api');
      
      if (options.expiresIn) {
        jwt.setExpirationTime(options.expiresIn);
      }
      
      if (options.subject) {
        jwt.setSubject(options.subject);
      }
      
      const token = await jwt.sign(privateKey);
      
      // Generate JTI for blacklisting
      const jti = crypto.randomBytes(16).toString('hex');
      
      // Store token info in Redis for blacklisting
      const tokenInfo = {
        jti,
        userId: payload.sub,
        orgId: payload.orgId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (options.expiresIn ? this.parseExpiresIn(options.expiresIn) : 15 * 60 * 1000)).toISOString()
      };
      
      await this.redis.setex(`jwt:token:${jti}`, 24 * 60 * 60, JSON.stringify(tokenInfo)); // Store for 24 hours
      
      return {
        token,
        jti,
        expiresIn: options.expiresIn || '15m'
      };
      
    } catch (error) {
      throw new Error('Failed to sign JWT: ' + error.message);
    }
  }

  /**
   * Verify JWT token
   */
  async verify(token) {
    try {
      // Check if token is blacklisted
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      const jti = header.jti;
      
      if (jti) {
        const isBlacklisted = await this.redis.exists(`jwt:blacklist:${jti}`);
        if (isBlacklisted) {
          throw new Error('Token has been revoked');
        }
      }
      
      // Resolve verification key
      const { key, kid } = await this.resolveVerificationKey(token);
      
      // Verify token
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        issuer: 'cate',
        audience: ['cate-api', 'cate-refresh', 'cate-certificates']
      });
      
      return {
        payload,
        kid,
        jti
      };
      
    } catch (error) {
      throw new Error('Failed to verify JWT: ' + error.message);
    }
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(jti, reason = 'manual_revocation') {
    try {
      await this.redis.setex(`jwt:blacklist:${jti}`, 24 * 60 * 60, JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString()
      }));
      
      console.log(`🚫 Token blacklisted: ${jti} (${reason})`);
      
    } catch (error) {
      throw new Error('Failed to blacklist token: ' + error.message);
    }
  }

  /**
   * Blacklist all tokens for a user
   */
  async blacklistUserTokens(userId, reason = 'user_logout') {
    try {
      // Get all tokens for user
      const keys = await this.redis.keys(`jwt:token:*`);
      
      for (const key of keys) {
        const tokenData = await this.redis.get(key);
        if (tokenData) {
          const token = JSON.parse(tokenData);
          if (token.userId === userId) {
            const jti = key.split(':')[2];
            await this.blacklistToken(jti, reason);
          }
        }
      }
      
      console.log(`🚫 All tokens blacklisted for user: ${userId}`);
      
    } catch (error) {
      throw new Error('Failed to blacklist user tokens: ' + error.message);
    }
  }

  /**
   * Get JWKS (JSON Web Key Set)
   */
  async getJWKS() {
    try {
      const jwks = {
        keys: []
      };
      
      // Add current and previous keys
      for (const [kid, key] of this.keys.entries()) {
        jwks.keys.push(key.publicKey);
      }
      
      return jwks;
      
    } catch (error) {
      throw new Error('Failed to generate JWKS: ' + error.message);
    }
  }

  /**
   * Parse expiresIn string to milliseconds
   */
  parseExpiresIn(expiresIn) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiresIn format');
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(user, options = {}) {
    const payload = {
      sub: user.id,
      orgId: user.organization_id,
      role: user.role,
      email: user.email
    };
    
    // Generate access token (15 minutes)
    const accessToken = await this.sign(payload, {
      ...options,
      expiresIn: '15m',
      audience: 'cate-api'
    });
    
    // Generate refresh token (7 days)
    const refreshToken = await this.sign({
      sub: user.id,
      type: 'refresh'
    }, {
      expiresIn: '7d',
      audience: 'cate-refresh'
    });
    
    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken, user) {
    try {
      // Verify refresh token
      const { payload } = await this.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }
      
      if (payload.sub !== user.id) {
        throw new Error('Token user mismatch');
      }
      
      // Generate new access token
      const newPayload = {
        sub: user.id,
        orgId: user.organization_id,
        role: user.role,
        email: user.email
      };
      
      const accessToken = await this.sign(newPayload, {
        expiresIn: '15m',
        audience: 'cate-api'
      });
      
      return {
        accessToken: accessToken.token,
        expiresIn: 15 * 60
      };
      
    } catch (error) {
      throw new Error('Failed to refresh token: ' + error.message);
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats() {
    try {
      const stats = {
        activeKeys: this.keys.size,
        currentKid: this.currentKid,
        blacklistedTokens: await this.redis.dbsize(),
        totalTokens: await this.redis.keys('jwt:token:*').then(keys => keys.length)
      };
      
      return stats;
      
    } catch (error) {
      throw new Error('Failed to get token stats: ' + error.message);
    }
  }
}

module.exports = new JWTService();
