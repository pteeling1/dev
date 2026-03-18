/**
 * List Configurations Endpoint
 * GET /api/configs
 * 
 * Returns: [ { id, metadata, ... }, ... ]
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');
const { getUserConfigurations } = require('../shared/cosmosHelper');

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
    context.log('List configs request');

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    const userId = auth.sub;

    // Get configurations
    const configs = await getUserConfigurations(userId);

    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: configs
    };
  } catch (error) {
    context.log('❌ Error listing configurations:', error);
    context.res = {
      status: 500,
      headers: getCorsHeaders(),
      body: {
        error: 'Failed to retrieve configurations',
        details: error.message
      }
    };
  }
};
