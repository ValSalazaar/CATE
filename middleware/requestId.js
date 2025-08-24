import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * 
 * Generates a unique request ID for each request and adds it to:
 * - Request object (req.requestId)
 * - Response headers (X-Request-ID)
 * - Logs (via req.requestId)
 */
export function requestIdMiddleware(req, res, next) {
  // Get request ID from header or generate new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add to request object for use in other middleware and routes
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Add to response headers for CORS
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
  
  next();
}

/**
 * Request ID Generator
 * 
 * Utility function to generate request IDs with custom prefixes
 */
export function generateRequestId(prefix = '') {
  const id = uuidv4();
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Extract Request ID from Request
 * 
 * Utility function to extract request ID from request object
 */
export function getRequestId(req) {
  return req.requestId || req.headers['x-request-id'] || 'unknown';
}

export default {
  requestIdMiddleware,
  generateRequestId,
  getRequestId
};
