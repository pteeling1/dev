#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Utility: Make HTTPS request and return parsed JSON
function httpGet(hostname, requestPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: requestPath,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Azure-Local-Blog-Generator',
        ...headers
      }
    };

    https.get(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        }
      });
    }).on('error', reject);
  });
}

// Utility: Make HTTPS POST request (for Claude API)
function httpPost(hostname, requestPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data);
    const options = {
      hostname,
      path: requestPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData),
        'User-Agent': 'Azure-Local-Blog-Generator',
        ...headers
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(jsonData);
    req.end();
  });
}

// Call Claude API
async function callClaudeAPI(prompt, githubToken) {
  console.log('📝 Calling Claude API via Anthropic...');
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }
  
  const response = await httpPost(
    'api.anthropic.com',
    '/v1/messages',
    {
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  );

  const content = response?.content?.[0]?.text;
  if (!content) {
    throw new Error('No content in Claude response');
  }

  console.log('✅ Claude response received');
  return content;
}

// Fetch recent Azure Local commits
async function fetchAzureLocalCommits() {
  console.log('🔍 Fetching Azure Local commits...');
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const response = await httpGet(
    'api.github.com',
    `/repos/MicrosoftDocs/azure-stack-docs/commits?sha=main&since=${sevenDaysAgo}&per_page=50`
  );

  if (!Array.isArray(response) || response.length === 0) {
    console.log('⚠️  No commits found in past 7 days');
    return null;
  }

  console.log(`✅ Found ${response.length} commits`);

  // Find an Azure Local-related commit (broad filter)
  let commit = response.find(c => 
    /azure.local|azure\/local|hci/i.test(c.commit.message)
  ) || response[0];

  console.log(`📌 Selected commit: ${commit.sha.slice(0, 7)}`);
  return commit;
}

// Fetch full commit with diffs
async function fetchFullCommit(sha) {
  console.log(`📂 Fetching full commit details...`);
  
  const response = await httpGet(
    'api.github.com',
    `/repos/MicrosoftDocs/azure-stack-docs/commits/${sha}`
  );

  console.log(`✅ Retrieved ${response.files?.length || 0} files`);
  return response;
}

// Map GitHub path to docs.microsoft.com URL
function githubPathToDocsUrl(filepath) {
  // Some files don't have direct public URLs on learn.microsoft.com
  // Link to the most relevant published documentation page instead
  
  let cleanPath = filepath.replace(/\.md$/, '');
  
  // AKS-Arc files -> link to Azure Local documentation
  if (cleanPath.startsWith('AKS-Arc/')) {
    return `https://learn.microsoft.com/en-us/azure/azure-local/?view=azloc-2601`;
  }
  
  // Include files are internal, link to relevant topic
  if (cleanPath.includes('/includes/')) {
    if (cleanPath.includes('vm-prerequisites')) {
      return `https://learn.microsoft.com/en-us/azure/azure-local/?view=azloc-2601`;
    }
    return `https://learn.microsoft.com/en-us/azure/azure-local/whats-new?view=azloc-2601`;
  }
  
  // Standard mapping
  return `https://learn.microsoft.com/en-us/azure/${cleanPath}?view=azloc-2601`;
}

// Parse diff to extract meaningful added/removed lines
function extractMeaningfulDiffs(files) {
  const changes = [];
  
  for (const file of files.slice(0, 5)) {
    if (!file.patch) continue;
    
    const lines = file.patch.split('\n');
    const added = [];
    const removed = [];
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.substring(1).trim();
        if (content.length > 15 && !content.match(/^[#\s]*$/)) added.push(content);
      }
      if (line.startsWith('-') && !line.startsWith('---')) {
        const content = line.substring(1).trim();
        if (content.length > 15 && !content.match(/^[#\s]*$/)) removed.push(content);
      }
    }
    
    if (added.length > 0 || removed.length > 0) {
      changes.push({
        file: file.filename,
        docsUrl: githubPathToDocsUrl(file.filename),
        added: added.slice(0, 4),
        removed: removed.slice(0, 4)
      });
    }
  }
  
  return changes;
}

// Build the prompt for Claude
function buildPrompt(fullCommit) {
  const files = fullCommit.files || [];
  const meaningfulChanges = extractMeaningfulDiffs(files);
  
  // Create structured change descriptions with links
  const changesWithUrls = meaningfulChanges.map(c => {
    const filename = c.file.split('/').pop().replace(/\.md$/, '');
    let changes = [];
    
    // Find the most significant changes, skipping metadata lines
    const significantAdded = c.added.filter(line => 
      !line.match(/^(ms\.|author:|ms\.date:|description:)/) 
    );
    const significantRemoved = c.removed.filter(line => 
      !line.match(/^(ms\.|author:|ms\.date:|description:)/) 
    );
    
    // Include the first 2 significant lines for better context
    if (significantRemoved.length > 0) {
      const removedContext = significantRemoved.slice(0, 2).join(' | ');
      changes.push(`Removed: ${removedContext}`);
    }
    if (significantAdded.length > 0) {
      const addedContext = significantAdded.slice(0, 2).join(' | ');
      changes.push(`Added: ${addedContext}`);
    } else if (c.added.length > 0) {
      // If only metadata was added, show that
      changes.push(`Updated: ${c.added[0]}`);
    }
    
    return {
      filename,
      url: c.docsUrl,
      change: changes.join(' | ')
    };
  }).slice(0, 8);

  const changesList = changesWithUrls.map(c => {
    const lines = (c.added || []).concat(c.removed || []);
    const summary = lines.length > 0 ? `\n      Content: ${lines.join(' | ')}` : '';
    return `- **${c.filename}** (${c.url}): ${c.change}${summary}`;
  }).join('\n');

  return `You are an Azure Local infrastructure expert. Analyze these documentation changes and create a technical blog post.

COMMIT: ${fullCommit.commit.message}

FILES CHANGED:
${changesList}

Create a bulleted list (5-8 bullets) describing the changes. Each bullet should be ONE SENTENCE and clearly explain:
- What changed in the documentation
- Why operations teams need to know about it
- Specific version applicability (e.g., "Applies to upgrades from Azure Stack HCI 22H2 to 23H2 or 24H2" or "For all new 24H2 deployments")

CRITICAL: Search the content snippets for any mention of:
- Version numbers (22H2, 23H2, 24H2, 20349, 25398, 26100)
- "upgrade from" or "upgrade to" language
- "applies to" or "only for" qualifiers

Include only changes that affect deployments, procedures, or requirements. If you can't find any substantive changes worth blogging about, create an empty response.

Format each bullet as:
- Description of change and operational impact

Return ONLY the bulleted list, nothing else.`;
}

// Generate blog post object
function createBlogPost(claudeContent, fullCommit) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dateDisplay = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Parse Claude's bullet points and inject links
  const meaningfulChanges = extractMeaningfulDiffs(fullCommit.files || []);
  const urlMap = new Map();
  meaningfulChanges.forEach(c => {
    urlMap.set(c.docsUrl, true);
  });
  
  // Extract bullet points from Claude's response
  const bulletLines = claudeContent
    .split('\n')
    .filter(line => line.trim().startsWith('-') && line.trim().length > 2);
  
  // Since we don't have direct filename references in the bullets,
  // we'll pair each bullet with a relevant documentation link
  const bulletChunks = bulletLines.slice(0, urlMap.size).map((line, idx) => {
    const url = Array.from(urlMap.keys())[idx];
    let bullet = line.trim();
    if (bullet.startsWith('- ')) {
      bullet = bullet.substring(2);
    }
    
    return `<p class="article-text">- ${bullet} <a href="${url}">→ Documentation</a></p>`;
  }).join('');
  
  // Get any remaining bullets without links
  const remainingBullets = bulletLines.slice(urlMap.size).map(line => {
    let bullet = line.trim();
    if (bullet.startsWith('- ')) {
      bullet = bullet.substring(2);
    }
    return `<p class="article-text">- ${bullet}</p>`;
  }).join('');
  
  const htmlContent = bulletChunks + remainingBullets;
  
  // Create reference section for any documentation links
  const allUrls = meaningfulChanges.map(c => c.docsUrl);
  const uniqueUrls = [...new Set(allUrls)];
  const referenceSection = uniqueUrls.length > 0
    ? `<p class="article-text"><strong>Related documentation:</strong> ${uniqueUrls.map((url, i) => {
        const name = url.includes('/deploy/') ? 'Deployment' : 
                     url.includes('/manage/') ? 'Management' :
                     url.includes('/whats-new') ? 'What\'s New' :
                     'Azure Local';
        return `<a href="${url}">${name}</a>`;
      }).join(' • ')}</p>`
    : '';

  return {
    id: `auto-${dateStr}-${Math.random().toString(36).slice(2, 10)}`,
    title: `Azure Local Update — ${dateDisplay}`,
    subtitle: 'Documentation changes',
    date: dateStr,
    content: htmlContent + referenceSection,
    source: 'Azure Local Blog Monitor',
    auto_generated: true,
    claude_generated: true
  };
}

// Main execution
async function main() {
  try {
    console.log('🚀 Azure Local Blog Generator');
    console.log('================================\n');

    // Check for test mode
    const testMode = process.env.TEST_MODE === 'true';
    
    // Check for GitHub token or Anthropic API key
    const githubToken = process.env.GITHUB_TOKEN || process.env.COPILOT_API_TOKEN;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    if (!testMode && !githubToken && !anthropicKey) {
      throw new Error('Please set TEST_MODE=true, GITHUB_TOKEN, or ANTHROPIC_API_KEY');
    }
    
    if (testMode) {
      console.log('🧪 Running in TEST MODE (using mock data)\n');
    }

    // Fetch commits
    let commit, fullCommit, claudeContent;
    
    if (testMode) {
      // Mock data for testing
      commit = {
        sha: 'abc1234567890def',
        commit: { message: 'Docs: Update Azure Local deployment guide' }
      };
      fullCommit = {
        sha: 'abc1234567890def',
        commit: { message: 'Docs: Update Azure Local deployment guide for v1.2.3' },
        files: [
          { filename: 'docs/deploy-azure-local.md', additions: 25, deletions: 12, patch: '--- a/docs/deploy-azure-local.md\n+++ b/docs/deploy-azure-local.md\n@@ -45,7 +45,10 @@\n ## Prerequisites\n\n+Updated for Azure Local v1.2.3\n These are the minimum requirements:' }
        ]
      };
      claudeContent = 'Azure Local deployment documentation has been updated to reflect the latest v1.2.3 release. Key changes include improved prerequisite documentation and additional guidance for cluster operators. This update simplifies the deployment experience and reduces common configuration errors.';
    } else {
      // Check if testing against a specific commit
      const testCommitSha = process.env.TEST_COMMIT;
      
      if (testCommitSha) {
        console.log(`🧪 Testing against specific commit: ${testCommitSha}`);
        fullCommit = await fetchFullCommit(testCommitSha);
      } else {
        commit = await fetchAzureLocalCommits();
        if (!commit) {
          console.log('💤 No commits found, skipping blog generation');
          process.exit(0);
        }

        // Get full commit with diffs
        fullCommit = await fetchFullCommit(commit.sha);
      }

      // Call Claude to generate blog content
      claudeContent = await callClaudeAPI(buildPrompt(fullCommit), githubToken);
      
      // Check if Claude decided not to generate a blog (empty response)
      const bulletLines = claudeContent.trim().split('\n').filter(line => line.trim().startsWith('-'));
      if (bulletLines.length === 0) {
        console.log('⏭️  No substantive changes found for blog post');
        process.exit(0);
      }
    }

    // Create blog post object
    const blogPost = createBlogPost(claudeContent, fullCommit);

    // Read blogs-data.json
    const blogsDataPath = path.join(__dirname, '..', 'blogs-data.json');
    console.log(`\n📖 Updating ${blogsDataPath}...`);

    let blogsData = { auto_posts: [] };
    if (fs.existsSync(blogsDataPath)) {
      const content = fs.readFileSync(blogsDataPath, 'utf8');
      try {
        blogsData = JSON.parse(content);
      } catch (e) {
        console.warn('⚠️  Could not parse existing blogs-data.json, starting fresh');
      }
    }

    // Add new post to beginning of array
    if (!Array.isArray(blogsData.auto_posts)) {
      blogsData.auto_posts = [];
    }
    blogsData.auto_posts.unshift(blogPost);

    // Write back to file
    fs.writeFileSync(blogsDataPath, JSON.stringify(blogsData, null, 2));
    console.log(`✅ Blog post added! Total posts: ${blogsData.auto_posts.length}`);

    console.log('\n📝 Generated Blog Post:');
    console.log(`   Title: ${blogPost.title}`);
    console.log(`   Content length: ${blogPost.content.length} chars`);
    console.log(`   ID: ${blogPost.id}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
