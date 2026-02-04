const https = require('https');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('❌ GITHUB_TOKEN environment variable not set');
  process.exit(1);
}

const prompt = `Write a 2-3 sentence blog post about Azure Local documentation changes. Be technical but concise. Focus on practical impact for operators. Key change: Added "Log on as a batch job" rights requirement for LCM user accounts.

Write as HTML paragraphs only (use <p> tags). Do not include any other formatting.`;

const requestData = JSON.stringify({
  model: 'claude-sonnet-4.5-20250514',
  messages: [
    {
      role: 'user',
      content: prompt
    }
  ],
  temperature: 0.7,
  max_tokens: 300
});

const options = {
  hostname: 'models.githubusercontentcdn.com',
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData)
  }
};

console.log('🤖 Calling GitHub Models API with Claude Sonnet 4.5...');
console.log(`Token: ${token.substring(0, 20)}...`);
console.log(`Endpoint: ${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.error) {
        console.error('❌ API Error:', response.error);
      } else if (response.choices && response.choices[0]) {
        console.log('\n✅ SUCCESS! Claude response:');
        console.log(response.choices[0].message.content);
      } else {
        console.log('Full response:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(requestData);
req.end();
