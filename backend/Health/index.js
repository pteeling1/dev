module.exports = async function (context, req) {
  try {
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Azure Functions API is running'
      })
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
