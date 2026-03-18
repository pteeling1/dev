/**
 * Save Configuration Endpoint
 * POST /api/configs
 * 
 * Body: {
 *   metadata: { name, description, ... },
 *   uiState: { ... },
 *   calculation: { ... },
 *   state: { ... }
 * }
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');
const { createConfiguration } = require('../shared/cosmosHelper');

module.exports = async function (context) {
  // Handle CORS preflight
  if (context.req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: ''
    };
    return;
  }

  try {
    context.log('Save config request');

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    const userId = auth.sub;
    const config = context.req.body;

    if (!config) {
      context.res = {
        status: 400,
        headers: getCorsHeaders(),
        body: { error: 'Request body is required' }
      };
      return;
    }

    // Create configuration
    const saved = await createConfiguration(userId, config);

    context.res = {
      status: 201,
      headers: getCorsHeaders(),
      body: {
        success: true,
        configId: saved.id,
        message: 'Configuration saved'
      }
    };
  } catch (error) {
    context.log('❌ Error saving configuration:', error);
    context.res = {
      status: 500,
      headers: getCorsHeaders(),
      body: {
        error: 'Failed to save configuration',
        details: error.message
      }
    };
  }
};
