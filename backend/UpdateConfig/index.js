/**
 * Update Configuration Endpoint
 * PUT /api/configs/{configId}
 * 
 * Body: { metadata, uiState, calculation, ... }
 * Response: { success: true, configId }
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');
const { getConfiguration, updateConfiguration } = require('../shared/cosmosHelper');

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
    context.log('Update config request:', context.bindingData.configId);

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    const userId = auth.sub;
    const configId = context.bindingData.configId;
    const updates = context.req.body;

    if (!updates) {
      context.res = {
        status: 400,
        headers: getCorsHeaders(),
        body: { error: 'Request body is required' }
      };
      return;
    }

    // Get existing to verify ownership
    const existing = await getConfiguration(configId);

    if (existing.userId !== userId) {
      context.res = {
        status: 403,
        headers: getCorsHeaders(),
        body: { error: 'Access denied' }
      };
      return;
    }

    // Update configuration
    await updateConfiguration(configId, updates);

    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: {
        success: true,
        configId,
        message: 'Configuration updated'
      }
    };
  } catch (error) {
    context.log('❌ Error updating configuration:', error);
    context.res = {
      status: error.code === 'NotFound' ? 404 : 500,
      headers: getCorsHeaders(),
      body: {
        error: 'Failed to update configuration',
        details: error.message
      }
    };
  }
};
