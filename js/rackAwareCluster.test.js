/**
 * Test Suite for Rack-Aware Clustering Logic
 * 
 * Run with: node js/rackAwareCluster.test.js
 */

import {
  getValidRackAwareConfigs,
  getRackAwareConfig,
  validateRackAwareNodeCount,
  calculateRackAwareStorage,
  calculateRackAwareComputeResources,
  calculateRequiredBandwidth,
  createRackAwareClusterSpec,
  getRackAwareConstraints,
  getRackAwareConversionPolicy,
  findSuitableRackAwareConfigs
} from './rackAwareCluster.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
    testsPassed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
    testsFailed++;
  }
}

function testGroup(name) {
  console.log(`\n${colors.cyan}━━━ ${name} ━━━${colors.reset}`);
}

function testSummary() {
  console.log(`\n${colors.cyan}━━━ Test Summary ━━━${colors.reset}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log(`Total: ${testsPassed + testsFailed}\n`);
  
  if (testsFailed === 0) {
    console.log(`${colors.green}All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Some tests failed!${colors.reset}\n`);
    process.exit(1);
  }
}

// ==================== TESTS ====================

testGroup('1. Configuration Retrieval');

const validConfigs = getValidRackAwareConfigs();
assert(validConfigs.length === 4, `Should have 4 valid configs, got ${validConfigs.length}`);
assert(validConfigs.includes('1+1'), 'Should include 1+1 config');
assert(validConfigs.includes('2+2'), 'Should include 2+2 config');
assert(validConfigs.includes('3+3'), 'Should include 3+3 config');
assert(validConfigs.includes('4+4'), 'Should include 4+4 config');

const config1Plus1 = getRackAwareConfig('1+1');
assert(config1Plus1 !== null, '1+1 config should exist');
assert(config1Plus1.totalNodes === 2, '1+1 should have 2 nodes');
assert(config1Plus1.usableCapacityRatio === 0.5, '1+1 should have 50% usable ratio');
assert(config1Plus1.volumeResiliency === '2-way mirror', '1+1 should use 2-way mirror');

const config2Plus2 = getRackAwareConfig('2+2');
assert(config2Plus2.totalNodes === 4, '2+2 should have 4 nodes');
assert(config2Plus2.usableCapacityRatio === 0.25, '2+2 should have 25% usable ratio');
assert(config2Plus2.volumeResiliency === '4-way mirror', '2+2 should use 4-way mirror');

const invalidConfig = getRackAwareConfig('5+5');
assert(invalidConfig === null, 'Invalid config should return null');

testGroup('2. Node Count Validation');

assert(validateRackAwareNodeCount(2) === '1+1', 'Node count 2 should map to 1+1');
assert(validateRackAwareNodeCount(4) === '2+2', 'Node count 4 should map to 2+2');
assert(validateRackAwareNodeCount(6) === '3+3', 'Node count 6 should map to 3+3');
assert(validateRackAwareNodeCount(8) === '4+4', 'Node count 8 should map to 4+4');
assert(validateRackAwareNodeCount(3) === null, 'Node count 3 should be invalid');
assert(validateRackAwareNodeCount(5) === null, 'Node count 5 should be invalid');

testGroup('3. Storage Calculation with Reserve Drives');

// Test 1+1 cluster: 2 nodes, 10 drives per node
const storage1Plus1 = calculateRackAwareStorage({
  totalNodeCount: 2,
  disksPerNode: 10,
  diskSizeTiB: 7.68,
  configKey: '1+1'
});

assert(storage1Plus1.totalDrives === 20, `1+1: total drives should be 20, got ${storage1Plus1.totalDrives}`);
assert(storage1Plus1.reservedDrivesCount === 2, `1+1: reserved drives should be 2, got ${storage1Plus1.reservedDrivesCount}`);
assert(storage1Plus1.usableDrives === 18, `1+1: usable drives should be 18, got ${storage1Plus1.usableDrives}`);
assert(storage1Plus1.usableCapacityRatio === 0.5, `1+1: ratio should be 0.5, got ${storage1Plus1.usableCapacityRatio}`);

const expectedRaw1Plus1 = 20 * 7.68;
const expectedDataTiB1Plus1 = 18 * 7.68;
const expectedUsable1Plus1 = expectedDataTiB1Plus1 * 0.5;
assert(
  Math.abs(storage1Plus1.totalRawTiB - expectedRaw1Plus1) < 0.01,
  `1+1: raw TiB should be ~${expectedRaw1Plus1}, got ${storage1Plus1.totalRawTiB}`
);
assert(
  Math.abs(storage1Plus1.usableCapacityTiB - expectedUsable1Plus1) < 0.01,
  `1+1: usable TiB should be ~${expectedUsable1Plus1}, got ${storage1Plus1.usableCapacityTiB}`
);

// Test 4+4 cluster: max reserve is 4 drives (not 8)
const storage4Plus4 = calculateRackAwareStorage({
  totalNodeCount: 8,
  disksPerNode: 10,
  diskSizeTiB: 7.68,
  configKey: '4+4'
});

assert(storage4Plus4.totalDrives === 80, `4+4: total drives should be 80, got ${storage4Plus4.totalDrives}`);
assert(storage4Plus4.reservedDrivesCount === 4, `4+4: reserved drives capped at 4, got ${storage4Plus4.reservedDrivesCount}`);
assert(storage4Plus4.usableDrives === 76, `4+4: usable drives should be 76, got ${storage4Plus4.usableDrives}`);

const expectedRaw4Plus4 = 80 * 7.68;
const expectedDataTiB4Plus4 = 76 * 7.68;
const expectedUsable4Plus4 = expectedDataTiB4Plus4 * 0.25;
assert(
  Math.abs(storage4Plus4.usableCapacityTiB - expectedUsable4Plus4) < 0.01,
  `4+4: usable TiB should be ~${expectedUsable4Plus4}, got ${storage4Plus4.usableCapacityTiB}`
);

testGroup('4. Compute Resources Calculation');

const compute2Plus2 = calculateRackAwareComputeResources({
  totalNodes: 4,
  usableCoresPerNode: 32,
  usableMemoryPerNode: 512,
  baseClockGHz: 3.0,
  configKey: '2+2'
});

assert(compute2Plus2.configKey === '2+2', '2+2 compute should be labeled 2+2');
assert(compute2Plus2.normal.activeNodes === 4, '2+2 normal: should have 4 active nodes');
assert(compute2Plus2.normal.usableCores === 128, '2+2 normal: should have 128 cores');
assert(compute2Plus2.normal.usableMemoryGB === 2048, '2+2 normal: should have 2048 GB memory');
assert(compute2Plus2.normal.usableGHz === 384, '2+2 normal: should have 384 GHz');

assert(compute2Plus2.postRackFailure.activeNodes === 2, '2+2 post-rack: should have 2 active nodes');
assert(compute2Plus2.postRackFailure.usableCores === 64, '2+2 post-rack: should have 64 cores');
assert(compute2Plus2.postRackFailure.usableMemoryGB === 1024, '2+2 post-rack: should have 1024 GB memory');

assert(compute2Plus2.faultTolerance.description.includes('Three faults'), '2+2 should tolerate 3 faults');
assert(compute2Plus2.scalingInfo.canScale === true, '2+2 should be scalable');
assert(compute2Plus2.scalingInfo.nextConfig === '3+3', '2+2 should scale to 3+3');

const compute1Plus1 = calculateRackAwareComputeResources({
  totalNodes: 2,
  usableCoresPerNode: 16,
  usableMemoryPerNode: 256,
  baseClockGHz: 2.5,
  configKey: '1+1'
});

assert(compute1Plus1.scalingInfo.canScale === false, '1+1 should not be scalable');
assert(compute1Plus1.scalingInfo.nextConfig === null, '1+1 should have no next config');

testGroup('5. Bandwidth Calculation');

const bw2Plus2 = calculateRequiredBandwidth('2+2', 25);
assert(bw2Plus2.totalBandwidthGbE === 50, `2+2 @ 25GbE: should need 50 GbE, got ${bw2Plus2.totalBandwidthGbE}`);
assert(bw2Plus2.dedicatedNetwork === true, 'Bandwidth requirement should specify dedicated network');

const bw4Plus4 = calculateRequiredBandwidth('4+4', 10);
assert(bw4Plus4.totalBandwidthGbE === 40, `4+4 @ 10GbE: should need 40 GbE, got ${bw4Plus4.totalBandwidthGbE}`);

testGroup('6. Complete Cluster Specification');

const spec = createRackAwareClusterSpec({
  configKey: '2+2',
  totalNodes: 4,
  disksPerNode: 10,
  diskSizeTiB: 7.68,
  usableCoresPerNode: 32,
  usableMemoryPerNode: 512,
  baseClockGHz: 3.0,
  nicSpeedGbE: 25
});

assert(spec.deploymentType === 'Rack-Aware Cluster', 'Spec should be rack-aware deployment');
assert(spec.configuration === '2+2', 'Spec should be 2+2 configuration');
assert(spec.topology.zones === 2, 'Spec should have 2 zones');
assert(spec.topology.nodesPerZone === 2, 'Spec should have 2 nodes per zone');
assert(spec.storage !== null, 'Spec should include storage calculation');
assert(spec.compute !== null, 'Spec should include compute calculation');
assert(spec.bandwidth !== null, 'Spec should include bandwidth calculation');
assert(spec.constraints !== null, 'Spec should include constraints');
assert(spec.scalabilityPath.canScale === true, 'Spec should indicate scalability');

testGroup('7. Constraints and Policies');

const constraints = getRackAwareConstraints();
assert(constraints.availabilityZones.maxZones === 2, 'Should have max 2 zones');
assert(constraints.latency.maxRoundTripMs === 1, 'Latency should be max 1ms');
assert(constraints.storage.types.includes('NVMe'), 'Should support NVMe drives');

const policy = getRackAwareConversionPolicy();
assert(policy.canConvertFromStandard === false, 'Should not allow conversion from standard');
assert(policy.reason.includes('new deployments'), 'Policy reason should mention new deployments');

testGroup('8. Find Suitable Configurations');

const workload = {
  requiredCores: 64,
  requiredMemoryGB: 1024,
  requiredStorageTiB: 50,
  baseClockGHz: 3.0,
  usableCoresPerNode: 32,
  usableMemoryPerNode: 512,
  disksPerNode: 10,
  diskSizeTiB: 7.68
};

const suitable = findSuitableRackAwareConfigs(workload);
assert(suitable.length === 4, `Should return 4 configurations, got ${suitable.length}`);
assert(suitable[0].fits === true, 'First suitable config should fit all requirements');

// Check that 1+1 doesn't fit this workload
const oneByOne = suitable.find(s => s.configKey === '1+1');
assert(oneByOne.fits === false, '1+1 should not fit large workload');

// Check 2+2
const twoByTwo = suitable.find(s => s.configKey === '2+2');
assert(twoByTwo.fits === true, '2+2 should fit workload');
assert(twoByTwo.fitBreakdown.cores.sufficient === true, '2+2 should have enough cores');
assert(twoByTwo.fitBreakdown.memory.sufficient === true, '2+2 should have enough memory');
assert(twoByTwo.fitBreakdown.storage.sufficient === true, '2+2 should have enough storage');

testGroup('9. Edge Cases');

// Test error handling
try {
  calculateRackAwareStorage({
    totalNodeCount: 2,
    disksPerNode: 10,
    diskSizeTiB: 7.68,
    configKey: 'invalid'
  });
  assert(false, 'Should throw error for invalid config');
} catch (e) {
  assert(e.message.includes('Invalid'), 'Should throw error for invalid config');
}

try {
  calculateRackAwareComputeResources({
    totalNodes: 3, // Invalid: 1+1 requires 2
    usableCoresPerNode: 32,
    usableMemoryPerNode: 512,
    baseClockGHz: 3.0,
    configKey: '1+1'
  });
  assert(false, 'Should throw error for node count mismatch');
} catch (e) {
  assert(e.message.includes('mismatch'), 'Should throw error for node count mismatch');
}

// ==================== RUN SUMMARY ====================

testSummary();
