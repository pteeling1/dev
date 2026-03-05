#!/usr/bin/env node

import { sizeCluster } from './js/sizingEngine.js';

// Suppress console.table and other verbose logs
const originalTable = console.table;
const originalLog = console.log;
let logBuffer = [];
console.table = () => {}; // Suppress table output
console.log = (...args) => {
  const msg = args.join(' ');
  if (!msg.includes('📍') && !msg.includes('selectOptimal') && !msg.includes('Selected:')) {
    logBuffer.push(msg);
  }
};

const beca_psc = {
  totalCPU: 16,
  totalRAM: 48,
  totalStorage: 6.29,
  growthPct: 0,
  haLevel: 'n+1',
  disableSweetSpot: true
};

console.log = originalLog; // Restore for final output
console.log('\nBECA-PSC: All Chassis Test (Batch Mode - Minimize Nodes)');
console.log('Requirements: 16 cores (62 vCPU / 3.875 P2V), 48 GB RAM, 6.29 TB Disk\n');

const results = {};
['AX-4510c', 'AX 760', 'AX 770'].forEach(chassis => {
  try {
    const result = sizeCluster({ ...beca_psc, chassisModel: chassis });
    results[chassis] = result.nodeCount;
    console.log(`${chassis.padEnd(12)} → ${result.nodeCount} nodes`);
  } catch (err) {
    results[chassis] = null;
    console.log(`${chassis.padEnd(12)} → ERROR`);
  }
});

const viable = Object.entries(results).filter(([_, nodes]) => nodes !== null);
if (viable.length > 0) {
  const minNodes = Math.min(...viable.map(([_, nodes]) => nodes));
  console.log(`\nMinimum nodes (batch mode): ${minNodes}`);
}

