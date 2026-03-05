#!/usr/bin/env node

// Import the sizing engine
import { sizeCluster } from './js/sizingEngine.js';

// BECA-PSC test case: 17 VMs, 62 vCPU, 48 GB RAM, 6.29 TB storage, P2V=3.875
// Physical cores = 62 / 3.875 = 16 cores

const beca_psc_payload = {
  totalCPU: 16,          // Physical cores from 62 vCPU / 3.875 P2V
  totalRAM: 48,          // GB
  totalStorage: 6.29,    // TiB
  growthPct: 0,
  haLevel: 'n+1',
  chassisModel: 'AX 760'
};

console.log('\n📊 BECA-PSC Sizing Test');
console.log('='.repeat(70));
console.log('INPUT REQUIREMENTS:');
console.log(`  VM Count: 17`);
console.log(`  Physical Cores Required: 16 (from 62 vCPU / 3.875 P2V ratio)`);
console.log(`  RAM Required: 48 GB`);
console.log(`  Storage Required: 6.29 TiB`);
console.log(`  HA Level: N+1 (must survive single node failure)`);
console.log(`  Chassis: AX-760`);
console.log('='.repeat(70));
console.log('\nRESULT:');

try {
  const result = sizeCluster(beca_psc_payload);
  
  console.log(`  ✅ Nodes recommended: ${result.nodeCount}`);
  console.log(`  Chassis: ${result.chassisModel}`);
  
  console.log('\nCOMPARISON TO ACTUAL CONFIG:');
  console.log(`  Actual nodes: 2`);
  console.log(`  Sizing recommends: ${result.nodeCount} nodes`);
  console.log(`  Match: ${result.nodeCount === 2 ? '✓' : '✗ DIFFERENT'}`);
  
} catch (err) {
  console.error(`  ❌ SIZING FAILED: ${err.message}`);
  process.exit(1);
}

console.log('='.repeat(70));

