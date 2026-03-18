/**
 * Auth0 JWT Validation Helper
 * Validates JWT tokens from Auth0 and extracts user info
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE || 'https://sizer.teeling.ai';

// Cache for JWKS (public keys from Auth0)
let cachedJwks = null;
let jwksExpireTime = 0;

/**
 * Fetch JWKS from Auth0
 */
async function getJwks() {
  const now = Date.now();
  
  // Use cache if still valid (cache for 1 hour)
  if (cachedJwks && jwksExpireTime > now) {
    return cachedJwks;
  }

  try {
    const response = await axios.get(`https://${auth0Domain}/.well-known/jwks.json`);
    cachedJwks = response.data;
    jwksExpireTime = now + (60 * 60 * 1000); // Cache for 1 hour
    return cachedJwks;
  } catch (error) {
    console.error('Failed to fetch JWKS:', error.message);
    throw new Error('Failed to fetch Auth0 public keys');
  }
}

/**
 * Get the public key from JWKS
 */
function getPublicKey(header, callback) {
  getJwks()
    .then(jwks => {
      const key = jwks.keys.find(k => k.kid === header.kid);
      callback(null, key ? key.x5c[0] : null);
    })
    .catch(err => callback(err));
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error('No token provided'));
    }

    // Remove "Bearer " prefix if present
    const cleanToken = token.replace('Bearer ', '');

    jwt.verify(
      cleanToken,
      (header, callback) => getPublicKey(header, callback),
      {
        audience: auth0Audience,
        issuer: `https://${auth0Domain}/`,
        algorithms: ['RS256']
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

/**
 * Middleware-like function to check JWT from Azure Functions context
 */
async function authenticateRequest(context) {
  try {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      context.res = {
        status: 401,
        body: { error: 'Missing authorization header' }
      };
      return null;
    }

    const decoded = await verifyToken(authHeader);
    return decoded;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    context.res = {
      status: 401,
      body: { error: 'Unauthorized: Invalid or missing token', details: error.message }
    };
    return null;
  }
}

/**
 * CORS headers for responses
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCorsPreFlight(context) {
  context.res = {
    status: 200,
    headers: getCorsHeaders(),
    body: ''
  };
}

module.exports = {
  verifyToken,
  authenticateRequest,
  getCorsHeaders,
  handleCorsPreFlight
};
