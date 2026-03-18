/**
 * Get Single Configuration Endpoint
 * GET /api/configs/{configId}
 * 
 * Response: { id, metadata, ... }
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');
const { getConfiguration } = require('../shared/cosmosHelper');

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
    context.log('Get config request:', context.bindingData.configId);

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    const userId = auth.sub;
    const configId = context.bindingData.configId;

    // Get configuration
    const config = await getConfiguration(configId);

    // Verify ownership
    if (config.userId !== userId) {
      context.res = {
        status: 403,
        headers: getCorsHeaders(),
        body: { error: 'Access denied' }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: config
    };
  } catch (error) {
    context.log('❌ Error getting configuration:', error);
    context.res = {
      status: error.code === 'NotFound' ? 404 : 500,
      headers: getCorsHeaders(),
      body: {
        error: 'Configuration not found',
        details: error.message
      }
    };
  }
};
