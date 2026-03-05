import { sizeCluster } from './js/sizingEngine.js';

// FREB-PSC: 40 VMs, 142 vCPU, 116 GB RAM, 5.988 TB Disk, P2V=4.4375
// Physical cores needed: 142 / 4.4375 = 32 cores

const config = {
  totalCPU: 32,            // 142 vCPU / 4.4375 P2V ratio
  totalGHz: undefined,
  totalRAM: 116,           // GB
  totalStorage: 5.988,     // TB
  haLevel: "n+1"
};

console.log('\n🎯 FREB-PSC Sizing Test (Batch Mode - All Chassis)');
console.log('================================================================');
console.log('Requirements:');
console.log('  - Physical Cores: 32 (from 142 vCPU / 4.4375 P2V)');
console.log('  - RAM: 116 GB');
console.log('  - Storage: 5.988 TB');
console.log('  - P2V Ratio: 4.4375');
console.log('  - HA Mode: N+1 Survivability');
console.log('================================================================\n');

// Suppress console.table output temporarily
const originalTable = console.table;
console.table = () => {};

const results = {};

for (const chassis of ['AX-4510c', 'AX-760', 'AX-770']) {
  const payload = { ...config, chassisModel: chassis };
  
  try {
    const result = sizeCluster(payload);
    const sockets = chassis === 'AX-4510c' ? 1 : 2;
    const coresPerNode = result.physicalCoresPerNode;
    
    results[chassis] = {
      nodes: result.nodeCount,
      cpu: result.cpuModel || 'N/A',
      cores: result.cpuCoresPerSocket || '-',
      sockets: sockets,
      coresPerNode: coresPerNode,
      memory: result.memorySizeGB + ' GB',
      memoryPerNode: Math.ceil(result.memorySizeGB / result.nodeCount) + ' GB',
      disks: `${result.disksPerNode}×${result.diskSizeTB}TB`,
      viable: '✓'
    };
  } catch (err) {
    results[chassis] = { error: err.message };
  }
}

// Restore console.table
console.table = originalTable;

// Display results
console.log('📋 RESULTS BY CHASSIS:\n');
for (const [chassis, data] of Object.entries(results)) {
  if (!data.error) {
    console.log(`${chassis}:`);
    console.log(`  Nodes: ${data.nodes}`);
    console.log(`  CPU: ${data.cpu} (${data.cores} cores × ${data.sockets} sockets = ${data.coresPerNode}/node)`);
    console.log(`  Memory: ${data.memory} total (${data.memoryPerNode} per node)`);
    console.log(`  Storage: ${data.disks} per node`);
    console.log();
  } else {
    console.log(`${chassis}: ERROR - ${data.error}\n`);
  }
}

// Find minimum node count
const minNodes = Math.min(...Object.values(results)
  .filter(r => !r.error)
  .map(r => r.nodes || Infinity));

const validResults = Object.entries(results).filter(([_, r]) => !r.error);
const minConfigs = validResults.filter(([_, r]) => r.nodes === minNodes);

console.log('================================================================');
console.log(`⭐ BATCH MINIMUM: ${minNodes} nodes\n`);

// Validate post-failure survivability for each configuration with minimum nodes
for (const [chassis, data] of minConfigs) {
  const postFailureCores = Math.max(0, (minNodes - 1) * data.coresPerNode - 4);
  const passed = postFailureCores >= 32;
  
  console.log(`✓ ${chassis} with ${minNodes} nodes:`);
  console.log(`  CPU: ${data.cpu}`);
  console.log(`  Cores per node: ${data.coresPerNode}`);
  console.log(`  Post-failure cores: (${minNodes} - 1) × ${data.coresPerNode} - 4 = ${postFailureCores}`);
  console.log(`  Requirement: 32 cores`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
}

console.log('================================================================');
