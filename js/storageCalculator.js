import { cpuList } from './cpuData.js';
import { convertTBtoTiB } from './utils.js';

export function calculateUsableStorage(nodes, disksPerNode, diskSizeTB, resiliency, nodeType, memorySize, cpuModel) {
  const resiliencyFactors = { "2-way": 0.5, "3-way": 1 / 3 };
  const resiliencyFactor = resiliencyFactors[resiliency];
  if (!resiliencyFactor) {
    console.warn("Invalid resiliency level:", resiliency);
    return getDefaultStats(nodes);
  }

  // Step 1: Raw
  const rawTB = nodes * disksPerNode * diskSizeTB;

  // Step 2: Reserve (policy-based)
  const reserveTB = Math.min(nodes, 4) * diskSizeTB;

  // Step 3: Available for resiliency
  const availableTB = rawTB - reserveTB;

  // Step 4: Usable after resiliency
  const usableTB = availableTB * resiliencyFactor;

  // Step 5: Convert to TiB
  const rawTiB = convertTBtoTiB(rawTB);
  const reserveTiB = convertTBtoTiB(reserveTB);
  const usableTiB = convertTBtoTiB(usableTB);

  // Resiliency overhead (the rest of availableTB)
  const resiliencyTB = availableTB * (1 - resiliencyFactor);
  const resiliencyTiB = convertTBtoTiB(resiliencyTB);

  return {
    nodeCount: nodes,
    rawTB: rawTB.toFixed(2),
    rawTiB,
    reservedTB: reserveTB.toFixed(2),
    reserveTiB,
    availableTB: availableTB.toFixed(2),
    usableTB: usableTB.toFixed(2),
    usableTiB,
    resiliencyTB: resiliencyTB.toFixed(2),
    resiliencyTiB,
    // CPU/memory stats as before...
  };

  const cpu = cpuList.find(c => c.model === cpuModel);
  if (!cpu) {
    console.warn("Invalid CPU selection:", cpuModel);
    return getDefaultStats(nodes, rawStorageTB, reservedStorageTB, resiliencyStorageTB, usableStorageTB, usableStorageTiB);
  }

  const totalCores = cpu.cores * nodes;
  const totalGHz = (cpu.base_clock_GHz * totalCores).toFixed(2);
  const totalMemoryGB = memorySize * nodes;

  return {
    nodeCount: nodes,
    rawTB: rawStorageTB.toFixed(2),
    reservedTB: reservedStorageTB.toFixed(2),
    resiliencyTB: resiliencyStorageTB.toFixed(2),
    usableTB: usableStorageTB.toFixed(2),
    usableTiB: usableStorageTiB,
    totalCores,
    totalGHz,
    totalMemoryGB
  };
}

function getDefaultStats(nodes, raw = 0, reserved = 0, resiliency = 0, usable = 0, usableTiB = 0) {
  return {
    nodeCount: nodes,
    rawTB: raw.toFixed(2),
    reservedTB: reserved.toFixed(2),
    resiliencyTB: resiliency.toFixed(2),
    usableTB: usable.toFixed(2),
    usableTiB,
    totalCores: "N/A",
    totalGHz: "N/A",
    totalMemoryGB: "N/A"
  };
}