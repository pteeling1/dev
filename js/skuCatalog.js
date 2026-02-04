/**
 * SKU Catalog for Azure Local configurations
 * Maps components to Dell SKUs (hardware only, no pricing/licensing)
 * 
 * Component SKUs for CPUs, Memory, Storage, and Networking are maintained in componentSKUs.js
 * This allows easy updates without modifying application code.
 */

import { componentSKUs } from './componentSKUs.js';

export const skuCatalog = {
  // ========== CHASSIS ==========
  chassis: {
    "AX 670": {
      sku: "210-BSWW",
      description: "Azure Local AX-670 2U Chassis"
    },
    "AX 770": {
      sku: "210-BSWV",
      description: "Azure Local AX-770 2U Chassis"
    },
    "AX 760": {
      sku: "210-BNVJ",
      description: "Dell AX-760 2U Chassis"
    }
  },

  // ========== CPUs (loaded from componentSKUs.json) ==========
  cpu: componentSKUs.cpus || {},

  // ========== MEMORY (loaded from componentSKUs.json) ==========
  memory: componentSKUs.memory || {},

  // ========== STORAGE (NVMe - loaded from componentSKUs.json) ==========
  storage: componentSKUs.storage || {},

  // ========== NETWORKING (loaded from componentSKUs.json) ==========
  networking: componentSKUs.networking || {},

  // ========== POWER & COOLING ==========
  power: {
    "1100W PSU": {
      sku: "450-BDRS",
      description: "Dual, Fault Tolerant Redundant (1+1), Hot-Plug MHS Power Supply, 1100W MM (100-240Vac) Titanium"
    },
    "1400W PSU": {
      sku: "450-BGKV",
      description: "Dual, 1+1 Fault-Tolerant Redundant, Hot-Plug Power Supply, 1400W -48VDC, NAF"
    },
    "1500W PSU": {
      sku: "450-BCXC",
      description: "Dual, Fault Tolerant Redundant(1+1), Hot-Plug MHS Power Supply, 1500W MM (100-240Vac) Titanium"
    }
  },

  cooling: {
    "HCI 1U High Performance Silver Fan": {
      sku: "384-BFCM",
      description: "HCI 1U High Performance Silver Fan"
    },
    "HCI 2U High Performance Gold Fan": {
      sku: "384-BFCL",
      description: "HCI 2U High Performance Gold Fan"
    }
  },

  // ========== INFRASTRUCTURE ==========
  infrastructure: {
    "BOSS-N1 Controller": {
      sku: "403-BDMC",
      description: "BOSS-N1 controller card with 2 M.2 960GB (RAID 1)"
    },
    "Cable Management Arm": {
      sku: "770-BDRQ",
      description: "Cable Management Arm, 2U"
    },
    "ReadyRails Sliding Rails": {
      sku: "770-BECD",
      description: "ReadyRails Sliding Rails"
    },
    "1U Standard Bezel": {
      sku: "321-BLHX",
      description: "1U Standard Bezel"
    }
  },

  // ========== LICENSING ==========
  licensing: {
    "Base License": {
      sku: "634-CLPY",
      description: "Azure Local with Windows Server 2025 Guest VMs"
    },
    "16-Core License": {
      sku: "149-BCGJ",
      description: "Azure Local with Windows Server DC 2025 (16 Core)"
    },
    "4-Core Add-on": {
      sku: "149-BCGH",
      description: "Azure Local with Windows Server DC 2025 (4 Core add-on)"
    }
  }
};

/**
 * Helper: Get SKU for a component
 * @param {string} category - e.g., "cpu", "memory", "storage"
 * @param {string} componentKey - e.g., "Intel Xeon 6 Performance 6737P"
 * @param {string} [chassisModel] - for chassis-specific SKUs (rarely used now)
 * @returns {object|null} { sku, description } or null if not found
 */
export function getSKU(category, componentKey, chassisModel = null) {
  const component = skuCatalog[category]?.[componentKey];
  if (!component) return null;

  // Handle chassis-specific SKUs (legacy support)
  if (chassisModel && component[`sku_${chassisModel.replace(/\s+/g, '')}`]) {
    return {
      sku: component[`sku_${chassisModel.replace(/\s+/g, '')}`],
      description: component.description
    };
  }

  return {
    sku: component.sku,
    description: component.description
  };
}
