/**
 * Delete Configuration Endpoint
 * DELETE /api/configs/{configId}
 * 
 * Response: { success: true }
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');
const { getConfiguration, deleteConfiguration } = require('../shared/cosmosHelper');

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
    context.log('Delete config request:', context.bindingData.configId);

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    const userId = auth.sub;
    const configId = context.bindingData.configId;

    // Get to verify ownership
    const config = await getConfiguration(configId);

    if (config.userId !== userId) {
      context.res = {
        status: 403,
        headers: getCorsHeaders(),
        body: { error: 'Access denied' }
      };
      return;
    }

    // Delete
    await deleteConfiguration(configId);

    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: {
        success: true,
        message: 'Configuration deleted'
      }
    };
  } catch (error) {
    context.log('❌ Error deleting configuration:', error);
    context.res = {
      status: error.code === 'NotFound' ? 404 : 500,
      headers: getCorsHeaders(),
      body: {
        error: 'Failed to delete configuration',
        details: error.message
      }
    };
  }
};
