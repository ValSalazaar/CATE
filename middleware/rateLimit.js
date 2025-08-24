import rateLimit from 'express-rate-limit';

// Rate limiting for webhook endpoints
export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many webhook requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use provider_session_id for webhook rate limiting if available
    if (req.body && req.body.provider_session_id) {
      return req.body.provider_session_id;
    }
    return req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Rate limiting for general API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Rate limiting for KYC start endpoint
export const kycStartRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 KYC starts per hour
  message: {
    error: 'Too many KYC session attempts from this IP',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if available, otherwise use IP
    if (req.body && req.body.userId) {
      return req.body.userId;
    }
    return req.ip;
  }
});

// Rate limiting for VC issuance endpoint
export const vcIssuanceRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 VC issuances per hour
  message: {
    error: 'Too many credential issuance attempts from this IP',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if available, otherwise use IP
    if (req.body && req.body.userId) {
      return req.body.userId;
    }
    return req.ip;
  }
});

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default {
  webhookRateLimit,
  apiRateLimit,
  kycStartRateLimit,
  vcIssuanceRateLimit,
  authRateLimit
};
