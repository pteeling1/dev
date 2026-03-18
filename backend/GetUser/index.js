/**
 * Get User Profile Endpoint
 * GET /api/user
 * Returns: { userId, email, nickname, ... }
 */

const { authenticateRequest, getCorsHeaders } = require('../shared/authHelper');

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
    context.log('Get user request');

    // Verify authentication
    const auth = await authenticateRequest(context);
    if (!auth) return; // authenticateRequest sets error response

    context.res = {
      status: 200,
      headers: getCorsHeaders(),
      body: {
        userId: auth.sub,
        email: auth.email,
        nickname: auth.nickname || 'User'
      }
    };
  } catch (error) {
    context.log('❌ Error getting user info:', error);
    context.res = {
      status: 500,
      headers: getCorsHeaders(),
      body: { error: 'Failed to get user info' }
    };
  }
}
