/**
 * Backend API Server for AX Calculator Save/Load
 * Express-based server for Azure App Service
 * 
 * Endpoints:
 *   GET    /api/health           - health check
 *   GET    /api/user             - get current user info
 *   POST   /api/configs          - save new config
 *   GET    /api/configs          - list all configs for user
 *   GET    /api/configs/:id      - get specific config
 *   PUT    /api/configs/:id      - update config
 *   DELETE /api/configs/:id      - delete config
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3001;
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'teeling sizer API dev';
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'ax-calculator';
const COSMOS_CONTAINER = process.env.COSMOS_CONTAINER || 'configurations';

console.log('🔧 Configuration:');
console.log(`  PORT: ${PORT}`);
console.log(`  AUTH0_DOMAIN: ${AUTH0_DOMAIN}`);
console.log(`  AUTH0_AUDIENCE: ${AUTH0_AUDIENCE}`);
console.log(`  COSMOS_ENDPOINT: ${COSMOS_ENDPOINT}`);
console.log(`  COSMOS_DATABASE: ${COSMOS_DATABASE}`);
console.log(`  COSMOS_CONTAINER: ${COSMOS_CONTAINER}`);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: [
    'https://sizer.teeling.ai',
    'https://green-moss-0c759f91e.azurestaticapps.net',
    'https://thankyoutech.azurestaticapps.net',
    'https://lively-water-06ffcb510.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:8000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================================================
// DATABASE SETUP
// ============================================================================

let container;

async function initializeDatabase() {
  try {
    const cosmosClient = new CosmosClient({
      endpoint: COSMOS_ENDPOINT,
      key: COSMOS_KEY
    });

    const database = cosmosClient.database(COSMOS_DATABASE);
    container = database.container(COSMOS_CONTAINER);
    
    console.log(`✅ Connected to Cosmos DB database: ${COSMOS_DATABASE}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    return false;
  }
}

// ============================================================================
// AUTH HELPER
// ============================================================================

async function verifyAuth0Token(token) {
  try {
    if (!token) throw new Error('No token provided');
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    // Get JWKS
    const response = await axios.get(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`);
    const jwks = response.data;
    
    // Decode token header to get kid
    const decoded = jwt.decode(cleanToken, { complete: true });
    if (!decoded) throw new Error('Invalid token format');
    
    const kid = decoded.header.kid;
    const key = jwks.keys.find(k => k.kid === kid);
    if (!key) throw new Error('Key not found in JWKS');
    
    // Verify token
    const verified = jwt.verify(cleanToken, key.publicKey || key.x5c[0], {
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    });
    
    return verified;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw error;
  }
}

// Auth middleware
function checkJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  verifyAuth0Token(token)
    .then(decoded => {
      req.auth = decoded;
      next();
    })
    .catch(error => {
      console.error('Auth error:', error.message);
      res.status(401).json({ error: 'Invalid token' });
    });
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: container ? 'connected' : 'disconnected'
  });
});

/**
 * Get current user info
 */
app.get('/api/user', checkJwt, (req, res) => {
  const user = {
    sub: req.auth.sub,
    email: req.auth[`${AUTH0_DOMAIN}/email`] || req.auth.email,
    nickname: req.auth.nickname,
    name: req.auth.name
  };
  
  res.json(user);
});

/**
 * Save a new configuration
 * POST /api/configs
 */
app.post('/api/configs', checkJwt, async (req, res) => {
  try {
    if (!container) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const userId = req.auth.sub;
    const config = req.body;

    if (!config.metadata || !config.metadata.name) {
      return res.status(400).json({ error: 'Configuration must have a name' });
    }

    // Generate unique ID
    const configId = `${userId}#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`;

    // Build document for Cosmos DB
    const document = {
      id: configId,
      userId,
      ...config,
      serverCreatedDate: new Date().toISOString()
    };

    // Save to Cosmos DB
    const { resource } = await container.items.create(document);

    console.log(`✅ Saved config for user ${userId}: ${configId}`);

    res.status(201).json({
      configId,
      success: true,
      createdAt: document.serverCreatedDate
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * List all configurations for the current user
 * GET /api/configs
 */
app.get('/api/configs', checkJwt, async (req, res) => {
  try {
    if (!container) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const userId = req.auth.sub;

    // Query for all configs by this user
    const { resources: configs } = await container.items
      .query(`SELECT * FROM c WHERE c.userId = @userId ORDER BY c.serverCreatedDate DESC`, {
        parameters: [{ name: '@userId', value: userId }]
      })
      .fetchAll();

    console.log(`✅ Retrieved ${configs.length} configs for user ${userId}`);

    res.json({
      success: true,
      count: configs.length,
      configs
    });
  } catch (error) {
    console.error('Error listing configs:', error);
    res.status(500).json({ error: error.message || 'Failed to list configurations' });
  }
});

/**
 * Get a specific configuration
 * GET /api/configs/:id
 */
app.get('/api/configs/:id', checkJwt, async (req, res) => {
  try {
    if (!container) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const configId = req.params.id;
    const userId = req.auth.sub;

    // Verify user owns this config
    const { resource: config } = await container.item(configId).read();

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (config.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this configuration' });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message || 'Failed to get configuration' });
  }
});

/**
 * Update a configuration
 * PUT /api/configs/:id
 */
app.put('/api/configs/:id', checkJwt, async (req, res) => {
  try {
    if (!container) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const configId = req.params.id;
    const userId = req.auth.sub;
    const updates = req.body;

    // Read current config
    const { resource: config } = await container.item(configId).read();

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (config.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this configuration' });
    }

    // Merge update
    const updated = {
      ...config,
      ...updates,
      userId: config.userId, // Prevent userId change
      id: config.id, // Prevent id change
      serverCreatedDate: config.serverCreatedDate, // Preserve original creation date
      serverLastModifiedDate: new Date().toISOString()
    };

    // Replace in Cosmos DB
    await container.item(configId).replace(updated);

    console.log(`✅ Updated config: ${configId}`);

    res.json({
      success: true,
      config: updated
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message || 'Failed to update configuration' });
  }
});

/**
 * Delete a configuration
 * DELETE /api/configs/:id
 */
app.delete('/api/configs/:id', checkJwt, async (req, res) => {
  try {
    if (!container) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const configId = req.params.id;
    const userId = req.auth.sub;

    // Verify user owns this config before deleting
    const { resource: config } = await container.item(configId).read();

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (config.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this configuration' });
    }

    // Delete from Cosmos DB
    await container.item(configId).delete();

    console.log(`✅ Deleted config: ${configId}`);

    res.json({
      success: true,
      message: 'Configuration deleted'
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: error.message || 'Failed to delete configuration' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// STARTUP
// ============================================================================

async function start() {
  // Initialize database first
  const dbReady = await initializeDatabase();

  if (!dbReady && COSMOS_ENDPOINT) {
    console.error('⚠️ Database initialization failed, but server will start');
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
    console.log(`   Health check: GET http://localhost:${PORT}/api/health`);
  });
}

// Only start if this is the main module
if (require.main === module) {
  start().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = app;
