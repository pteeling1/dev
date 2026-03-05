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

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║              FREB-PSC SIZING TEST RESULTS                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\nINPUT REQUIREMENTS:');
console.log('  vCPU: 142 (physical cores: 32 ÷ 4.4375 P2V ratio)');
console.log('  RAM: 116 GB');
console.log('  Storage: 5.988 TB');
console.log('  HA Mode: N+1 Survivability');
console.log('  Workload: Batch sizing (minimize nodes)\n');

const results = [];

for (const chassis of ['AX-4510c', 'AX-760', 'AX-770']) {
  const payload = { ...config, chassisModel: chassis };
  
  const result = sizeCluster(payload);
  const sockets = chassis === 'AX-4510c' ? 1 : 2;
  const coresPerNode = result.physicalCoresPerNode;
  const postFailureCores = (result.nodeCount - 1) * coresPerNode - 4;
  
  results.push({
    chassis,
    nodes: result.nodeCount,
    cpu: result.cpuModel,
    coresPerSocket: result.cpuCoresPerSocket,
    coresPerNode,
    sockets,
    postFailureCores,
    passesValidation: postFailureCores >= 32,
    memory: result.memorySizeGB,
    storage: `${result.disksPerNode}×${result.diskSizeTB}TB`
  });
}

console.log('RESULTS BY CHASSIS:');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const r of results) {
  const status = r.passesValidation ? '✅ VALID' : '❌ INVALID';
  console.log(`${r.chassis} with ${r.nodes} nodes:`);
  console.log(`  CPU: ${r.cpu}`);
  console.log(`    Cores: ${r.coresPerSocket}/socket × ${r.sockets} socket = ${r.coresPerNode}/node`);
  console.log(`  Memory: ${r.memory} GB total`);
  console.log(`  Storage: ${r.storage} per node`);
  console.log(`  Post-Failure Validation:`);
  console.log(`    Formula: (${r.nodes} - 1) × ${r.coresPerNode} - 4 = ${r.postFailureCores}`);
  console.log(`    Requirement: 32 cores`);
  console.log(`    ${status}`);
  console.log();
}

const minNodes = Math.min(...results.map(r => r.nodes));
const minResults = results.filter(r => r.nodes === minNodes);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`\n🎯 BATCH SIZING RECOMMENDATION: ${minNodes} nodes`);
console.log('\nOptimal Option(s):');
for (const r of minResults) {
  console.log(`  ✓ ${r.chassis} with ${r.nodes} nodes`);
  console.log(`    - CPU: ${r.cpu} (${r.coresPerNode} cores/node)`);
  console.log(`    - Post-failure survivability: ${r.postFailureCores} cores ≥ 32 ✓`);
}

console.log('\nOther Available Options:');
for (const r of results.filter(res => res.nodes > minNodes)) {
  console.log(`  ○ ${r.chassis} with ${r.nodes} nodes`);
  console.log(`    - More nodes for redundancy (${r.postFailureCores} post-failure cores)`);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
