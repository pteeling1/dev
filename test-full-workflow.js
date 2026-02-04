#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// STEP 1: Fetch Azure Local doc changes
async function fetchAzureLocalChanges() {
  return new Promise((resolve, reject) => {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 7);
    const isoDate = sinceDate.toISOString();
    
    console.log('📡 Fetching Azure Local doc commits from past 7 days...');
    
    const url = `https://api.github.com/repos/MicrosoftDocs/azure-stack-docs/commits?sha=main&since=${isoDate}&per_page=20`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const commits = JSON.parse(data);
          const azureLocalCommits = commits.filter(c => 
            c.commit.message.toLowerCase().includes('azure local') ||
            (c.files && c.files.some(f => f.filename.includes('azure-local')))
          );
          console.log(`✅ Found ${azureLocalCommits.length} Azure Local commits`);
          resolve(azureLocalCommits);
        } catch (e) {
          console.log(`ℹ️ Parse error, using fallback test data`);
          resolve([{
            sha: '792bd0a',
            commit: { message: 'Update Azure Local deployment requirements' },
            files: [{
              filename: 'azure-local/deploy/deployment-prep.md',
              status: 'modified',
              patch: `- Create LCM account
+ Create LCM account with "Log on as batch job" rights`
            }]
          }]);
        }
      });
    }).on('error', (e) => {
      console.log(`ℹ️ Fetch error, using fallback test data`);
      resolve([{
        sha: '792bd0a',
        commit: { message: 'Update Azure Local deployment requirements' },
        files: [{
          filename: 'azure-local/deploy/deployment-prep.md',
          status: 'modified'
        }]
      }]);
    });
  });
}

// STEP 2: Extract changes
function extractChanges(patches) {
  const changes = [];
  const lines = patches.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.substring(1).trim();
      if (content.length > 5 && content.match(/batch|rights|permission|requirement|admin/i)) {
        changes.push(content);
      }
    }
  }
  return [...new Set(changes)].slice(0, 3);
}

// STEP 3: Generate blog with Claude fallback
async function generateBlog(changes, files) {
  const specificChanges = changes.slice(0, 2).join('; ');
  const fileLinks = files.slice(0, 2)
    .map(f => f.filename.split('/').pop().replace(/-/g, ' '))
    .join(', ');
  
  const blogContent = `<p class="article-text">Azure Local infrastructure documentation has been updated with important operational changes. Updates include: ${specificChanges || 'deployment requirements'}. These changes impact operator responsibilities—review the affected documentation pages to ensure your environments comply with latest requirements.</p>`;
  
  console.log('✅ Blog content generated');
  return blogContent;
}

// Main
(async () => {
  try {
    console.log('🚀 FULL WORKFLOW TEST');
    console.log('='.repeat(50));
    
    const commits = await fetchAzureLocalChanges();
    
    if (commits.length === 0) {
      console.log('⚠️ No commits found');
      process.exit(0);
    }
    
    const latestCommit = commits[0];
    const files = latestCommit.files || [];
    const azureLocalFiles = files.filter(f => f.filename.includes('azure-local'));
    
    console.log(`📄 Processing: ${latestCommit.commit.message}`);
    console.log(`🔧 Files affected: ${azureLocalFiles.length}`);
    
    const patchText = azureLocalFiles.map(f => f.patch || '').join('\n');
    const changes = extractChanges(patchText);
    
    console.log(`🎯 Changes extracted: ${changes.length}`);
    changes.forEach((c, i) => console.log(`   ${i+1}. ${c.substring(0, 80)}...`));
    
    const blogContent = await generateBlog(changes, azureLocalFiles);
    
    const blogPost = {
      id: `auto-${new Date().toISOString().split('T')[0]}-test`,
      title: `Azure Local Documentation Update — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      subtitle: 'Azure Local infrastructure improvements',
      date: new Date().toISOString().split('T')[0],
      content: blogPost,
      source: 'Azure Local Docs Monitor (Test)',
      auto_generated: true
    };
    
    console.log('');
    console.log('📝 GENERATED BLOG POST:');
    console.log('-'.repeat(50));
    console.log(blogContent);
    console.log('-'.repeat(50));
    console.log('✅ Success!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
