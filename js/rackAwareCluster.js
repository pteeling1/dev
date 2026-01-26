/**
 * Rack-Aware Clustering Logic
 * 
 * This module integrates with the sizing engine to provide rack-aware cluster sizing.
 * It enforces Azure Local rack-aware cluster constraints (fixed node counts: 2, 4, 6, or 8 nodes)
 * and uses the main sizing engine for CPU/memory/disk selection logic.
 * 
 * Based on: https://learn.microsoft.com/en-us/azure/azure-local/concepts/rack-aware-cluster-requirements
 * 
 * Configurations supported:
 * - 1+1 (2 nodes): Two-way mirror, 50% usable capacity
 * - 2+2 (4 nodes): Four-way mirror, 25% usable capacity
 * - 3+3 (6 nodes): Four-way mirror, 25% usable capacity
 * - 4+4 (8 nodes): Four-way mirror, 25% usable capacity
 */

/**
 * Rack-aware cluster configuration metadata
 */
export const RACK_AWARE_CONFIGS = {
  '1+1': {
    name: '1+1 (2-node cluster)',
    totalNodes: 2,
    nodesPerZone: 1,
    volumeResiliency: '2-way mirror',
    usableCapacityRatio: 0.50, // 50% usable
    faultTolerance: {
      description: 'Single fault (drive, node, or rack)',
      maxDriveFaults: 1,
      maxNodeFaults: 1,
      maxRackFaults: 1,
      surviveRackFailure: true,
      details: 'Can tolerate failure of 1 drive, 1 node, or entire 1 rack'
    }
  },
  '2+2': {
    name: '2+2 (4-node cluster)',
    totalNodes: 4,
    nodesPerZone: 2,
    volumeResiliency: '4-way mirror',
    usableCapacityRatio: 0.25, // 25% usable
    faultTolerance: {
      description: 'Three faults (drive or node). If one rack fails, remaining can sustain one fault',
      maxDriveFaults: 3,
      maxNodeFaults: 3,
      maxRackFaults: 1,
      surviveRackFailure: true,
      details: 'Can tolerate 3 drive/node faults. If 1 rack (2 nodes) fails, remaining rack can lose 1 more node/drive'
    }
  },
  '3+3': {
    name: '3+3 (6-node cluster)',
    totalNodes: 6,
    nodesPerZone: 3,
    volumeResiliency: '4-way mirror',
    usableCapacityRatio: 0.25, // 25% usable
    faultTolerance: {
      description: 'Three faults (drive or node). If one rack fails, remaining can sustain one fault',
      maxDriveFaults: 3,
      maxNodeFaults: 3,
      maxRackFaults: 1,
      surviveRackFailure: true,
      details: 'Can tolerate 3 drive/node faults. If 1 rack (3 nodes) fails, remaining rack can lose 1 more node/drive'
    }
  },
  '4+4': {
    name: '4+4 (8-node cluster)',
    totalNodes: 8,
    nodesPerZone: 4,
    volumeResiliency: '4-way mirror',
    usableCapacityRatio: 0.25, // 25% usable
    faultTolerance: {
      description: 'Three faults (drive or node). If one rack fails, remaining can sustain one fault',
      maxDriveFaults: 3,
      maxNodeFaults: 3,
      maxRackFaults: 1,
      surviveRackFailure: true,
      details: 'Can tolerate 3 drive/node faults. If 1 rack (4 nodes) fails, remaining rack can lose 1 more node/drive'
    }
  }
};

/**
 * Returns list of all valid rack-aware configuration keys
 */
export function getValidRackAwareConfigs() {
  return Object.keys(RACK_AWARE_CONFIGS);
}

/**
 * Get configuration details for a specific rack-aware configuration
 * @param {string} configKey - Configuration key (e.g., '1+1', '2+2', '3+3', '4+4')
 * @returns {object|null} Configuration object or null if invalid
 */
export function getRackAwareConfig(configKey) {
  return RACK_AWARE_CONFIGS[configKey] || null;
}

/**
 * Validates if a given node count matches a rack-aware configuration
 * @param {number} nodeCount - Total number of nodes
 * @returns {string|null} Configuration key if valid, null otherwise
 */
export function validateRackAwareNodeCount(nodeCount) {
  for (const [key, config] of Object.entries(RACK_AWARE_CONFIGS)) {
    if (config.totalNodes === nodeCount) {
      return key;
    }
  }
  return null;
}

/**
 * Calculate usable storage for a rack-aware cluster configuration
 * 
 * DEPRECATED: For new code, prefer calling selectDiskConfig() from sizingEngine.js
 * with the appropriate resiliency level from the rack-aware config.
 * This function is kept for compatibility and testing.
 * 
 * Accounts for:
 * 1. Reserved drives: 1 drive per node, max 4 drives per cluster
 * 2. Volume resiliency: 2-way or 4-way mirroring
 * 3. Raw storage capacity divided by resiliency factor
 * 
 * @param {object} params - Parameters object
 * @param {number} params.totalNodeCount - Total nodes in cluster
 * @param {number} params.disksPerNode - Number of disks per node
 * @param {number} params.diskSizeTiB - Size of each disk in TiB
 * @param {string} params.configKey - Configuration key (e.g., '1+1', '2+2')
 * @returns {object} Storage breakdown with usable, reserve, resiliency, and raw capacities
 */
export function calculateRackAwareStorage(params) {
  const { totalNodeCount, disksPerNode, diskSizeTiB, configKey } = params;

  const config = getRackAwareConfig(configKey);
  if (!config) {
    throw new Error(`Invalid rack-aware configuration: ${configKey}`);
  }

  if (config.totalNodes !== totalNodeCount) {
    throw new Error(
      `Node count mismatch: expected ${config.totalNodes} nodes for '${configKey}', got ${totalNodeCount}`
    );
  }

  // Calculate reserved and usable drives
  // Reserve: 1 drive per node, but max 4 drives total
  const maxReservedDrives = 4;
  const reservedDrivesCount = Math.min(totalNodeCount, maxReservedDrives);
  const totalDrives = totalNodeCount * disksPerNode;
  const usableDrives = totalDrives - reservedDrivesCount;

  // Raw capacity calculations
  const totalRawTiB = totalDrives * diskSizeTiB;
  const reservedTiB = reservedDrivesCount * diskSizeTiB;
  const dataDrivesTiB = usableDrives * diskSizeTiB;

  // Apply resiliency factor (2-way mirror = 0.5, 4-way mirror = 0.25)
  const resiliencyFactor = config.usableCapacityRatio;
  const usableCapacityTiB = dataDrivesTiB * resiliencyFactor;
  const resiliencyTiB = totalRawTiB - usableCapacityTiB - reservedTiB;

  return {
    configKey,
    configName: config.name,
    totalNodeCount,
    disksPerNode,
    diskSizeTiB,
    
    // Drive accounting
    totalDrives,
    reservedDrivesCount,
    usableDrives,
    
    // Capacity breakdown
    totalRawTiB: parseFloat(totalRawTiB.toFixed(2)),
    reservedTiB: parseFloat(reservedTiB.toFixed(2)),
    dataDrivesTiB: parseFloat(dataDrivesTiB.toFixed(2)),
    usableCapacityTiB: parseFloat(usableCapacityTiB.toFixed(2)),
    resiliencyTiB: parseFloat(resiliencyTiB.toFixed(2)),
    
    // Configuration info
    volumeResiliency: config.volumeResiliency,
    usableCapacityRatio: resiliencyFactor,
    
    // Utilization info
    effectiveUsableRatio: (usableCapacityTiB / totalRawTiB).toFixed(4)
  };
}

/**
 * Calculate compute resource availability for rack-aware cluster
 * including post-rack-failure scenarios
 * 
 * @param {object} params - Parameters object
 * @param {number} params.totalNodes - Total number of nodes in cluster
 * @param {number} params.usableCoresPerNode - Usable cores available per node
 * @param {number} params.usableMemoryPerNode - Usable memory per node in GB
 * @param {number} params.baseClockGHz - CPU base clock speed in GHz
 * @param {string} params.configKey - Rack-aware config key ('1+1', '2+2', etc.)
 * @returns {object} Compute resources in normal and post-failure scenarios
 */
export function calculateRackAwareComputeResources(params) {
  const {
    totalNodes,
    usableCoresPerNode,
    usableMemoryPerNode,
    baseClockGHz,
    configKey
  } = params;

  const config = getRackAwareConfig(configKey);
  if (!config) {
    throw new Error(`Invalid rack-aware configuration: ${configKey}`);
  }

  if (config.totalNodes !== totalNodes) {
    throw new Error(
      `Node count mismatch: expected ${config.totalNodes} nodes for '${configKey}', got ${totalNodes}`
    );
  }

  const nodesPerZone = config.nodesPerZone;

  // Normal operation: all nodes available
  const normal = {
    activeNodes: totalNodes,
    usableCores: totalNodes * usableCoresPerNode,
    usableGHz: totalNodes * usableCoresPerNode * baseClockGHz,
    usableMemoryGB: totalNodes * usableMemoryPerNode
  };

  // Post-rack-failure: one entire rack fails
  const remainingNodes = totalNodes - nodesPerZone;
  const postRackFailure = {
    activeNodes: remainingNodes,
    usableCores: remainingNodes * usableCoresPerNode,
    usableGHz: remainingNodes * usableCoresPerNode * baseClockGHz,
    usableMemoryGB: remainingNodes * usableMemoryPerNode,
    rackLossDescription: `Lost entire ${nodesPerZone}-node rack`
  };

  // Post-additional-node-failure: one additional node fails after rack loss
  const postRackAndNodeFailure = {
    activeNodes: Math.max(remainingNodes - 1, 0),
    usableCores: Math.max(remainingNodes - 1, 0) * usableCoresPerNode,
    usableGHz: Math.max(remainingNodes - 1, 0) * usableCoresPerNode * baseClockGHz,
    usableMemoryGB: Math.max(remainingNodes - 1, 0) * usableMemoryPerNode,
    description: `Lost ${nodesPerZone}-node rack + 1 additional node`,
    survivalCapability: config.faultTolerance.details
  };

  return {
    configKey,
    configName: config.name,
    totalNodes,
    nodesPerZone,
    volumeResiliency: config.volumeResiliency,
    faultTolerance: config.faultTolerance,
    normal,
    postRackFailure,
    postRackAndNodeFailure,
    scalingInfo: {
      canScale: configKey !== '1+1', // 1+1 cannot be scaled in this release
      nextConfig: configKey === '1+1' ? null : (configKey === '2+2' ? '3+3' : (configKey === '3+3' ? '4+4' : null))
    }
  };
}

/**
 * Determines if a standard cluster can be converted to rack-aware
 * (Answer: No, based on Azure Local requirements)
 * @returns {object} Conversion policy
 */
export function getRackAwareConversionPolicy() {
  return {
    canConvertFromStandard: false,
    reason: 'Only new deployments are supported. Conversion from standard clusters to rack-aware clusters is not supported.',
    implications: 'Must deploy as rack-aware from inception'
  };
}

/**
 * Get rack-aware cluster deployment constraints
 * @returns {object} Constraint specifications
 */
export function getRackAwareConstraints() {
  return {
    availabilityZones: {
      maxZones: 2,
      maxNodesPerZone: 4,
      requirement: 'Two zones with equal number of machines'
    },
    latency: {
      maxRoundTripMs: 1,
      scope: 'Between racks',
      description: 'Round-trip latency between racks must be 1 millisecond or less'
    },
    storage: {
      requirement: 'All-flash drives required',
      types: ['NVMe', 'SSD'],
      network: 'Dedicated storage network required for synchronous replication'
    },
    scaling: {
      supportedConfigs: getValidRackAwareConfigs(),
      restrictedScalings: {
        '1+1': 'Cannot add nodes to 1+1 cluster in this release',
        '2+2': 'Can scale to 3+3 by adding a pair of nodes',
        '3+3': 'Can scale to 4+4 by adding a pair of nodes',
        '4+4': 'Maximum supported size'
      }
    }
  };
}

/**
 * Calculate required bandwidth for rack-aware cluster based on NIC speed and cluster size
 * @param {string} configKey - Configuration key ('1+1', '2+2', etc.)
 * @param {number} nicSpeedGbE - NIC speed in Gbps (10, 25, etc.)
 * @returns {object} Bandwidth requirement
 */
export function calculateRequiredBandwidth(configKey, nicSpeedGbE) {
  const config = getRackAwareConfig(configKey);
  if (!config) {
    throw new Error(`Invalid rack-aware configuration: ${configKey}`);
  }

  // Based on Azure documentation:
  // Each node count uses 2 NICs, and bandwidth = nodeCount * nicSpeed
  const nodesPerZone = config.nodesPerZone;
  const nicsPerZone = 2; // Each zone has 2 NICs
  const totalBandwidthGbE = nodesPerZone * nicSpeedGbE;

  return {
    configKey,
    configName: config.name,
    nicSpeedGbE,
    nicsPerZone,
    totalBandwidthGbE,
    dedicatedNetwork: true,
    purpose: 'Synchronous replication between racks',
    recommendation: `Ensure dedicated storage network with ${totalBandwidthGbE} GbE capacity`
  };
}

/**
 * Create a comprehensive rack-aware cluster specification
 * 
 * Called with hardware parameters from the sizing engine result.
 * Calculates storage and compute capabilities including post-rack-failure scenarios.
 * 
 * @param {object} params - Parameters for cluster specification
 * @param {string} params.configKey - Rack-aware config key ('1+1', '2+2', etc.)
 * @param {number} params.cpuCoresPerNode - CPU cores per node (from sizing engine)
 * @param {number} params.cpuGHzPerNode - CPU GHz per node (from sizing engine)
 * @param {number} params.memoryGBPerNode - Memory per node in GB (from sizing engine)
 * @param {number} params.disksPerNode - Number of disks per node (from sizing engine)
 * @param {number} params.diskSizeTiB - Size of each disk in TiB (from sizing engine)
 * @param {number} [params.nicSpeedGbE] - Optional NIC speed in Gbps
 * @returns {object} Complete rack-aware cluster specification
 */
export function createRackAwareClusterSpec(params) {
  const {
    configKey,
    cpuCoresPerNode,
    cpuGHzPerNode,
    memoryGBPerNode,
    disksPerNode,
    diskSizeTiB,
    nicSpeedGbE
  } = params;

  const config = getRackAwareConfig(configKey);
  if (!config) {
    throw new Error(`Invalid rack-aware configuration: ${configKey}`);
  }

  const totalNodes = config.totalNodes;
  const nodesPerZone = config.nodesPerZone;

  // Storage calculation using reserve space logic
  const totalDrives = totalNodes * disksPerNode;
  const reservedDrives = Math.min(totalNodes, 4); // 1 per node, max 4
  const usableDrives = totalDrives - reservedDrives;
  const totalRawTiB = totalDrives * diskSizeTiB;
  const reservedTiB = reservedDrives * diskSizeTiB;
  const dataDrivesTiB = usableDrives * diskSizeTiB;
  
  // Apply resiliency factor based on configuration
  const resiliencyFactor = config.usableCapacityRatio;
  const usableCapacityTiB = dataDrivesTiB * resiliencyFactor;
  const resiliencyTiB = totalRawTiB - usableCapacityTiB - reservedTiB;

  // Compute resources
  const totalCores = totalNodes * cpuCoresPerNode;
  const totalGHz = totalNodes * cpuCoresPerNode * cpuGHzPerNode;
  const totalMemoryGB = totalNodes * memoryGBPerNode;

  // Post-rack-failure scenarios
  const remainingNodes = totalNodes - nodesPerZone;
  const postRackFailureCores = remainingNodes * cpuCoresPerNode;
  const postRackFailureGHz = remainingNodes * cpuCoresPerNode * cpuGHzPerNode;
  const postRackFailureMemoryGB = remainingNodes * memoryGBPerNode;

  const bandwidthCalc = nicSpeedGbE
    ? calculateRequiredBandwidth(configKey, nicSpeedGbE)
    : null;

  return {
    deploymentType: 'Rack-Aware Cluster',
    configuration: configKey,
    configName: config.name,
    topology: {
      zones: 2,
      nodesPerZone: nodesPerZone,
      totalNodes: totalNodes,
      nodesPerRack: nodesPerZone // In 2-zone RA, zones = racks
    },
    hardware: {
      cpuCoresPerNode,
      cpuGHzPerNode,
      memoryGBPerNode,
      disksPerNode,
      diskSizeTiB
    },
    storage: {
      totalDrives,
      reservedDrives,
      usableDrives,
      totalRawTiB: parseFloat(totalRawTiB.toFixed(2)),
      reservedTiB: parseFloat(reservedTiB.toFixed(2)),
      dataDrivesTiB: parseFloat(dataDrivesTiB.toFixed(2)),
      usableCapacityTiB: parseFloat(usableCapacityTiB.toFixed(2)),
      resiliencyTiB: parseFloat(resiliencyTiB.toFixed(2)),
      volumeResiliency: config.volumeResiliency,
      usableCapacityRatio: resiliencyFactor
    },
    compute: {
      normal: {
        activeNodes: totalNodes,
        usableCores: totalCores,
        usableGHz: totalGHz,
        usableMemoryGB: totalMemoryGB
      },
      postRackFailure: {
        activeNodes: remainingNodes,
        usableCores: postRackFailureCores,
        usableGHz: postRackFailureGHz,
        usableMemoryGB: postRackFailureMemoryGB,
        rackLossDescription: `Lost entire ${nodesPerZone}-node rack`
      }
    },
    bandwidth: bandwidthCalc,
    constraints: getRackAwareConstraints(),
    faultTolerance: config.faultTolerance,
    scalabilityPath: {
      currentConfig: configKey,
      canScale: configKey !== '1+1',
      nextConfig: configKey === '1+1' ? null : (configKey === '2+2' ? '3+3' : (configKey === '3+3' ? '4+4' : null))
    }
  };
}

/**
 * Size a specific rack-aware configuration independently
 * 
 * Given a workload and a specific rack-aware config, finds the best disk layout
 * that meets storage requirements while respecting the fixed node count.
 * Uses the CPU/memory per node from the engine, but iterates disk count per config.
 * 
 * @param {object} params
 * @param {string} params.configKey - Rack-aware config ('1+1', '2+2', '3+3', '4+4')
 * @param {number} params.requiredCores - Total cores needed
 * @param {number} params.requiredMemoryGB - Total memory needed
 * @param {number} params.requiredStorageTiB - Total storage needed
 * @param {number} params.cpuCoresPerNode - CPU cores per node (fixed)
 * @param {number} params.cpuGHzPerNode - CPU GHz per node (fixed)
 * @param {number} params.memoryGBPerNode - Memory per node (fixed)
 * @param {number} params.cpuModel - CPU model name
 * @param {string} params.chassisModel - Chassis model for disk limits
 * @param {array} params.candidateDiskSizes - Array of disk sizes to try (TiB)
 * @param {array} params.candidateDiskCounts - Array of disk counts to try per node (optional - will use chassis limits if not provided)
 * @returns {object} Sizing result with best disk config, or null if no fit
 */
export function sizeRackAwareConfigIndependently(params) {
  const {
    configKey,
    requiredCores,
    requiredMemoryGB,
    requiredStorageTiB,
    cpuCoresPerNode,
    cpuGHzPerNode,
    memoryGBPerNode,
    cpuModel,
    chassisModel,
    candidateDiskSizes = [0.96, 1.92, 3.84, 7.68, 15.36],
    candidateDiskCounts = null // Will be set from chassis limits if not provided
  } = params;

  const config = getRackAwareConfig(configKey);
  if (!config) {
    throw new Error(`Invalid rack-aware configuration: ${configKey}`);
  }

  const nodeCount = config.totalNodes;
  const resiliencyLevel = config.volumeResiliency; // "2-way" or "4-way"

  // Import and use chassis-specific disk count limits
  // We need to import getValidDiskCounts - for now we'll use a fallback
  let validDiskCounts = candidateDiskCounts;
  if (!validDiskCounts) {
    // Fallback disk count limits per chassis model
    const diskLimits = {
      'AX 660': { min: 2, max: 24 },  // 16th Gen
      'AX 670': { min: 2, max: 16 },  // 17th Gen
      'AX 760': { min: 2, max: 24 },  // 16th Gen
      'AX 770': { min: 2, max: 16 }   // 17th Gen
    };
    const limit = diskLimits[chassisModel] || { min: 2, max: 24 };
    validDiskCounts = Array.from({ length: limit.max - limit.min + 1 }, (_, i) => i + limit.min);
  }

  // Try all combinations of disk size × disk count to find what works
  let bestConfig = null;
  let bestScore = Infinity;

  for (const diskSize of candidateDiskSizes) {
    for (const diskCount of validDiskCounts) {
      const totalDrives = nodeCount * diskCount;
      const reservedDrives = Math.min(nodeCount, 4);
      const usableDrives = totalDrives - reservedDrives;
      const totalRawTiB = totalDrives * diskSize;
      const dataDrivesTiB = usableDrives * diskSize;

      // Apply resiliency
      const resiliencyFactor = config.usableCapacityRatio; // 0.5 for 2-way, 0.25 for 4-way
      const usableCapacityTiB = dataDrivesTiB * resiliencyFactor;

      // Check if this meets storage requirement
      if (usableCapacityTiB < requiredStorageTiB) {
        continue; // Doesn't meet requirement
      }

      // Check compute
      const totalCores = nodeCount * cpuCoresPerNode;
      if (totalCores < requiredCores) {
        console.debug(`  ${configKey}: ${totalCores} cores < ${requiredCores} required (${diskCount} disks × ${diskSize} TiB)`);
        continue; // Doesn't meet CPU requirement
      }

      // Check memory
      const totalMemoryGB = nodeCount * memoryGBPerNode;
      if (totalMemoryGB < requiredMemoryGB) {
        console.debug(`  ${configKey}: ${totalMemoryGB} GB < ${requiredMemoryGB} required (${diskCount} disks × ${diskSize} TiB)`);
        continue; // Doesn't meet memory requirement
      }

      // This config works! Score it by overshoot (prefer minimal overshoot)
      const storageOvershoot = usableCapacityTiB - requiredStorageTiB;
      const score = storageOvershoot; // Smaller overshoot = better score

      if (score < bestScore) {
        bestScore = score;
        bestConfig = {
          configKey,
          nodeCount,
          disksPerNode: diskCount,
          diskSizeTiB: diskSize,
          totalRawTiB: parseFloat(totalRawTiB.toFixed(2)),
          reservedTiB: parseFloat((reservedDrives * diskSize).toFixed(2)),
          usableCapacityTiB: parseFloat(usableCapacityTiB.toFixed(2)),
          cpuCoresPerNode,
          cpuGHzPerNode,
          cpuModel,
          memoryGBPerNode,
          totalCores,
          totalGHz: totalCores * cpuGHzPerNode,
          totalMemoryGB,
          resiliencyLevel,
          meetsRequirements: true,
          overshoot: parseFloat(storageOvershoot.toFixed(2))
        };
      }
    }
  }

  if (!bestConfig) {
    // Log why it failed
    const totalCores = nodeCount * cpuCoresPerNode;
    const totalMemoryGB = nodeCount * memoryGBPerNode;
    const maxValidDiskCount = Math.max(...validDiskCounts);
    console.debug(`${configKey} sizing failed:`, {
      nodeCount,
      requiredCores,
      availableCores: totalCores,
      requiredMemoryGB,
      availableMemoryGB: totalMemoryGB,
      requiredStorageTiB,
      maxStorageWithMaxDisks: parseFloat((((nodeCount * maxValidDiskCount - Math.min(nodeCount, 4)) * 15.36 * config.usableCapacityRatio).toFixed(2))),
      chassis: chassisModel,
      validDiskCounts
    });
  }

  return bestConfig;
}

/**
 * Analyze all rack-aware configurations independently, sizing each one separately
 * 
 * @param {object} params
 * @param {number} params.requiredCores - Total cores needed
 * @param {number} params.requiredMemoryGB - Total memory needed
 * @param {number} params.requiredStorageTiB - Total storage needed
 * @param {number} params.cpuCoresPerNode - CPU cores per node (fixed across all configs)
 * @param {number} params.cpuGHzPerNode - CPU GHz per node
 * @param {string} params.cpuModel - CPU model name
 * @param {string} params.chassisModel - Chassis model
 * @returns {array} Array of all 4 configs with results, sorted by best fit
 */
export function analyzeAllRackAwareConfigs(params) {
  const {
    requiredCores,
    requiredMemoryGB,
    requiredStorageTiB,
    cpuCoresPerNode,
    cpuGHzPerNode,
    cpuModel,
    chassisModel
  } = params;

  const results = [];

  for (const configKey of getValidRackAwareConfigs()) {
    const sizedConfig = sizeRackAwareConfigIndependently({
      configKey,
      requiredCores,
      requiredMemoryGB,
      requiredStorageTiB,
      cpuCoresPerNode,
      cpuGHzPerNode,
      memoryGBPerNode: 512, // Default, would come from sizing engine in real usage
      cpuModel,
      chassisModel
    });

    if (sizedConfig && sizedConfig.meetsRequirements) {
      // Create full spec
      const spec = createRackAwareClusterSpec({
        configKey,
        cpuCoresPerNode,
        cpuGHzPerNode,
        memoryGBPerNode: sizedConfig.memoryGBPerNode,
        disksPerNode: sizedConfig.disksPerNode,
        diskSizeTiB: sizedConfig.diskSizeTiB
      });

      // Calculate utilization
      const coresUtil = (requiredCores / sizedConfig.totalCores * 100).toFixed(1);
      const memoryUtil = (requiredMemoryGB / sizedConfig.totalMemoryGB * 100).toFixed(1);
      const storageUtil = (requiredStorageTiB / sizedConfig.usableCapacityTiB * 100).toFixed(1);

      results.push({
        configKey,
        configName: spec.configName,
        fits: true,
        sizedConfig,
        spec,
        fitBreakdown: {
          cores: {
            required: requiredCores,
            available: sizedConfig.totalCores,
            sufficient: true,
            utilization: coresUtil + '%'
          },
          memory: {
            required: requiredMemoryGB,
            available: sizedConfig.totalMemoryGB,
            sufficient: true,
            utilization: memoryUtil + '%'
          },
          storage: {
            required: requiredStorageTiB,
            available: sizedConfig.usableCapacityTiB,
            sufficient: true,
            utilization: storageUtil + '%'
          }
        },
        faultTolerance: spec.faultTolerance,
        postRackFailureCapabilities: spec.compute.postRackFailure
      });
    } else {
      // No config found for this size
      results.push({
        configKey,
        configName: getRackAwareConfig(configKey).name,
        fits: false,
        reason: 'No disk configuration found that meets requirements with this node count'
      });
    }
  }

  // Sort: fits first, then by node count (smaller is better)
  results.sort((a, b) => {
    if (a.fits !== b.fits) return b.fits - a.fits;
    const aNodes = getRackAwareConfig(a.configKey).totalNodes;
    const bNodes = getRackAwareConfig(b.configKey).totalNodes;
    return aNodes - bNodes;
  });

  return results;
}
/**
 * DEPRECATED: Use analyzeAllRackAwareConfigs() instead
 * 
 * Wrapper for backward compatibility
 */
export function analyzeRackAwareFit(workload) {
  // Convert old format to new format
  return analyzeAllRackAwareConfigs({
    requiredCores: workload.requiredCores,
    requiredMemoryGB: workload.requiredMemoryGB,
    requiredStorageTiB: workload.requiredStorageTiB,
    cpuCoresPerNode: workload.usableCoresPerNode,
    cpuGHzPerNode: workload.baseClockGHz,
    cpuModel: 'Unknown',
    chassisModel: 'AX 770'
  });
}

/**
 * DEPRECATED: Use analyzeAllRackAwareConfigs() instead
 * 
 * Compare rack-aware configurations for a given workload
 * @deprecated Use analyzeAllRackAwareConfigs instead
 */
export function findSuitableRackAwareConfigs(workload) {
  const {
    requiredCores,
    requiredMemoryGB,
    requiredStorageTiB,
    baseClockGHz,
    usableCoresPerNode,
    usableMemoryPerNode,
    disksPerNode,
    diskSizeTiB
  } = workload;

  const results = [];

  for (const configKey of getValidRackAwareConfigs()) {
    const config = getRackAwareConfig(configKey);
    const computeCalc = calculateRackAwareComputeResources({
      totalNodes: config.totalNodes,
      usableCoresPerNode,
      usableMemoryPerNode,
      baseClockGHz,
      configKey
    });

    // Calculate storage with reserve space accounting
    const storageCalc = calculateRackAwareStorage({
      totalNodeCount: config.totalNodes,
      disksPerNode,
      diskSizeTiB,
      configKey
    });

    const coresFit = computeCalc.normal.usableCores >= requiredCores;
    const memoryFit = computeCalc.normal.usableMemoryGB >= requiredMemoryGB;
    const storageFit = storageCalc.usableCapacityTiB >= requiredStorageTiB;

    results.push({
      configKey,
      configName: config.name,
      fits: coresFit && memoryFit && storageFit,
      fitBreakdown: {
        cores: {
          required: requiredCores,
          available: computeCalc.normal.usableCores,
          sufficient: coresFit
        },
        memory: {
          required: requiredMemoryGB,
          available: computeCalc.normal.usableMemoryGB,
          sufficient: memoryFit
        },
        storage: {
          required: requiredStorageTiB,
          available: storageCalc.usableCapacityTiB,
          sufficient: storageFit
        }
      },
      utilization: {
        cores: (requiredCores / computeCalc.normal.usableCores * 100).toFixed(1) + '%',
        memory: (requiredMemoryGB / computeCalc.normal.usableMemoryGB * 100).toFixed(1) + '%',
        storage: (requiredStorageTiB / storageCalc.usableCapacityTiB * 100).toFixed(1) + '%'
      },
      faultTolerance: config.faultTolerance,
      compute: computeCalc.normal,
      storage: storageCalc
    });
  }

  // Sort by number of nodes (smaller is better if it fits)
  results.sort((a, b) => {
    if (a.fits !== b.fits) return b.fits - a.fits;
    const aNodes = getRackAwareConfig(a.configKey).totalNodes;
    const bNodes = getRackAwareConfig(b.configKey).totalNodes;
    return aNodes - bNodes;
  });

  return results;
}
