import { sizeCluster } from './js/sizingEngine.js';

// FREB-PSC: 40 VMs, 142 vCPU, 116 GB RAM, 5.988 TB Disk, P2V=4.4375
// Physical cores needed: 142 / 4.4375 = 32 cores

const freb_psc = {
  totalCPU: 32,            // 142 vCPU / 4.4375 P2V ratio
  totalGHz: undefined,
  totalRAM: 116,           // GB
  totalStorage: 5.988,     // TB
  haLevel: "n+1",
  chassisModel: "AX-760"   // Test with AX-760 first
};

console.log('\n📊 FREB-PSC Sizing Test');
console.log('================================================');
console.log('INPUT REQUIREMENTS:');
console.log('  Physical Cores Required: 32 (from 142 vCPU / 4.4375 P2V ratio)');
console.log('  RAM Required: 116 GB');
console.log('  Storage Required: 5.988 TiB');
console.log('  HA Level: N+1 (must survive single node failure)');
console.log('  Chassis: AX-760 (dual-socket, max 2048GB RAM, max 8×3.84TB disks)');
console.log('================================================\n');

// Test with all three chassis
const chassis_list = ['AX-4510c', 'AX-760', 'AX-770'];
const results = {};

for (const chassis of chassis_list) {
  const payload = { ...freb_psc, chassisModel: chassis };
  
  try {
    const result = sizeCluster(payload);
    results[chassis] = {
      nodes: result.nodeCount,
      cpu: result.selectedCpu?.model || 'N/A',
      cores: result.selectedCpu?.cores || 'N/A',
      memory: result.memoryConfig?.nodeMemory + ' GB',
      storage: result.diskConfig?.diskSizeTB + ' TB per disk',
      disksPerNode: result.diskConfig?.disksPerNode || 'N/A'
    };
    console.log(`✅ ${chassis}: ${result.nodeCount} nodes`);
  } catch (err) {
    results[chassis] = { error: err.message };
    console.log(`❌ ${chassis}: ${err.message}`);
  }
}

console.log('\n📋 SUMMARY - FREB-PSC All Chassis Results (Batch Mode):');
console.log('================================================');
console.table(results);

// Find minimum
const minNodes = Math.min(...Object.values(results)
  .filter(r => !r.error)
  .map(r => r.nodes || Infinity));

console.log(`\n🎯 Minimum nodes (batch mode): ${minNodes}`);
console.log(`   This is the recommendation for batch sizing (minimize nodes)`);

// Validate post-failure survivability for minimum node count
const minChassisEntry = Object.entries(results).find(([_, r]) => !r.error && r.nodes === minNodes);
if (minChassisEntry) {
  const [chassis, result] = minChassisEntry;
  const socketCount = chassis === 'AX-4510c' ? 1 : 2;
  const coresPerNode = typeof result.cores === 'number' ? result.cores * socketCount : 'unknown';
  const postFailureCores = minNodes > 1 ? (minNodes - 1) * coresPerNode - 4 : coresPerNode - 4;
  
  console.log(`\n🔍 Post-Failure Validation for ${minNodes}-node ${chassis}:`);
  console.log(`   CPU: ${result.cpu} (${result.cores} cores per socket)`);
  console.log(`   Cores per node: ${coresPerNode}`);
  console.log(`   Post-failure cores: (${minNodes} - 1) × ${coresPerNode} - 4 = ${postFailureCores}`);
  console.log(`   Required cores: 32`);
  console.log(`   Status: ${postFailureCores >= 32 ? '✅ PASS' : '❌ FAIL'}`);
}
