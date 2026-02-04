/**
 * Bill of Materials (BOM) Exporter
 * Generates a CSV BOM from sizing results
 */

import { skuCatalog, getSKU } from './skuCatalog.js';

/**
 * Extract DIMM count from memoryConfig string
 * e.g., "384 GB (24 × 16 GB)" → 24
 */
function parseDIMMCount(memoryConfig) {
  if (!memoryConfig || typeof memoryConfig !== "string") return null;
  const match = memoryConfig.match(/\((\d+)\s*×/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Calculate node count from sizing result
 */
function calculateNodeCount(sizingResult) {
  // If explicitly provided, use it
  if (sizingResult.nodeCount) {
    return sizingResult.nodeCount;
  }
  
  // Fallback: calculate from memory
  // nodeCount = totalUsableMemory / usableMemoryPerNode
  if (sizingResult.totalUsableMemory && sizingResult.usableMemoryPerNode) {
    return Math.ceil(sizingResult.totalUsableMemory / sizingResult.usableMemoryPerNode);
  }
  
  // Last resort
  return 1;
}

/**
 * Generate BOM line items from sizing result
 * @param {object} sizingResult - from window.lastSizingResult
 * @returns {array} Array of BOM line items
 */
function generateBOMItems(sizingResult) {
  if (!sizingResult) {
    console.error("❌ No sizing result available");
    return [];
  }

  const items = [];
  const nodeCount = calculateNodeCount(sizingResult);
  const chassisModel = sizingResult.chassisModel || "AX 770";
  const cpuModel = sizingResult.cpuModel || "Unknown";
  const memoryConfig = sizingResult.memoryConfig || "";
  const diskSizeTB = sizingResult.diskSizeTB || 1.92;
  const disksPerNode = sizingResult.disksPerNode || 2;
  
  // Parse DIMM count from memoryConfig string
  const dimmPerNode = parseDIMMCount(memoryConfig);
  // Extract DIMM size from pattern like "(24 × 16 GB)" → 16
  const dimmSize = memoryConfig.match(/×\s*(\d+)\s*GB/)?.[1] || "64";  // Extract DIMM size (16, 32, 64 GB)

  // ========== CHASSIS ==========
  const chassisSKU = getSKU("chassis", chassisModel);
  if (chassisSKU) {
    items.push({
      item: `${chassisModel} Chassis`,
      sku: chassisSKU.sku,
      qtyPerNode: 1,
      qtyTotal: nodeCount,
      description: chassisSKU.description
    });
  }

  // ========== CPUs ==========
  // Always 2 CPUs per node (do NOT multiply by nodeCount)
  const cpuSKU = getSKU("cpu", cpuModel);
  if (cpuSKU) {
    items.push({
      item: `CPU - ${cpuModel}`,
      sku: cpuSKU.sku,
      qtyPerNode: 2,
      qtyTotal: nodeCount * 2,
      description: cpuSKU.description
    });
  }

  // ========== MEMORY ==========
  // DIMMs per node (do NOT multiply further)
  const totalDIMMs = dimmPerNode || Math.ceil(sizingResult.totalUsableMemory / 64 / nodeCount);
  const memorySKU = getSKU("memory", `${dimmSize}GB`, chassisModel);
  if (memorySKU) {
    items.push({
      item: `Memory - ${dimmSize}GB RDIMM`,
      sku: memorySKU.sku,
      qtyPerNode: totalDIMMs,
      qtyTotal: nodeCount * totalDIMMs,
      description: memorySKU.description
    });
  }

  // ========== STORAGE (NVMe) ==========
  const diskKey = `${diskSizeTB}TB`;
  const storageSKU = getSKU("storage", diskKey);
  if (storageSKU) {
    items.push({
      item: `Storage - ${diskKey} NVMe`,
      sku: storageSKU.sku,
      qtyPerNode: disksPerNode,
      qtyTotal: nodeCount * disksPerNode,
      description: storageSKU.description
    });
  }

  // ========== NETWORKING (NIC) ==========
  // Determine NIC type based on storage configuration
  // 100GbE recommended if 12+ NVMe drives per chassis
  const nicType = disksPerNode >= 12 ? "ConnectX-6 Dx 100GbE PCIe" : "ConnectX-6 Lx 25GbE OCP";
  const nicSKU = getSKU("networking", nicType);
  if (nicSKU) {
    const nicSpeed = disksPerNode >= 12 ? "100GbE" : "25GbE";
    items.push({
      item: `NIC - NVIDIA ConnectX-6 ${nicSpeed}`,
      sku: nicSKU.sku,
      qtyPerNode: 2,
      qtyTotal: nodeCount * 2,
      description: nicSKU.description
    });
  }




  // ========== LICENSING ==========
  // Calculate licensing based on cores per node
  // Each 16-core license covers one CPU (16 cores)
  const coresPerNode = sizingResult.physicalCoresPerNode || 32;
  const baseLicensesPerNode = Math.floor(coresPerNode / 16);
  const remainingCoresPerNode = coresPerNode % 16;
  const addonLicensesPerNode = Math.ceil(remainingCoresPerNode / 4);

  // Base licensing enabler (634-CLPY) - 1 per cluster
  const baseLicenseSKU = getSKU("licensing", "Base License");
  if (baseLicenseSKU) {
    items.push({
      item: "Azure Local Windows Server 2025 (Base)",
      sku: baseLicenseSKU.sku,
      qtyPerNode: 1,
      qtyTotal: 1,  // Per cluster, not per node
      description: baseLicenseSKU.description
    });
  }

  // 16-core licenses (149-BCGJ) - per node, then total
  const coreLicenseSKU = getSKU("licensing", "16-Core License");
  if (coreLicenseSKU && baseLicensesPerNode > 0) {
    items.push({
      item: "Azure Local Windows Server DC 2025 (16 Core)",
      sku: coreLicenseSKU.sku,
      qtyPerNode: baseLicensesPerNode,
      qtyTotal: baseLicensesPerNode * nodeCount,  // Per node × number of nodes
      description: coreLicenseSKU.description
    });
  }

  // 4-core add-on licenses (149-BCGH) - per node, then total
  const addonLicenseSKU = getSKU("licensing", "4-Core Add-on");
  if (addonLicenseSKU && addonLicensesPerNode > 0) {
    items.push({
      item: "Azure Local Windows Server DC 2025 (4 Core add-on)",
      sku: addonLicenseSKU.sku,
      qtyPerNode: addonLicensesPerNode,
      qtyTotal: addonLicensesPerNode * nodeCount,  // Per node × number of nodes
      description: addonLicenseSKU.description
    });
  }

  return items;
}

/**
 * Convert BOM items to CSV format
 * @param {array} items - BOM line items
 * @param {number} nodeCount - number of nodes
 * @returns {string} CSV content
 */
function itemsToCSV(items, nodeCount) {
  const headers = ["Item", "Qty Per Node", "Total Qty (x" + nodeCount + ")", "Description"];
  
  const rows = items.map(item => [
    `"${item.item.replace(/"/g, '""')}"`,
    item.qtyPerNode,
    item.qtyTotal,
    `"${item.description.replace(/"/g, '""')}"`
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

/**
 * Export BOM as CSV download
 * @param {string} [projectName="AX_BOM"]
 */
export function exportBOM(projectName = "AX_BOM") {
  const sizingResult = window.lastSizingResult;
  
  if (!sizingResult) {
    alert("❌ No sizing configuration found. Please calculate first.");
    return;
  }

  try {
    // Generate summary and log it
    const summary = getBOMSummary();
    
    const items = generateBOMItems(sizingResult);
    const nodeCount = calculateNodeCount(sizingResult);
    const csv = itemsToCSV(items, nodeCount);

    // Create and download CSV file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${projectName}_BOM_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("✅ BOM exported successfully:", filename);
    console.log(`📦 ${summary.componentSummary.chassis} Chassis | ${summary.componentSummary.cpus} CPUs | ${summary.componentSummary.memory} DIMMs | ${summary.componentSummary.storage} Drives | ${summary.componentSummary.nics} NICs`);
  } catch (error) {
    console.error("❌ BOM export failed:", error);
    alert(`Error exporting BOM: ${error.message}`);
  }
}

/**
 * Generate BOM summary (for preview/logging)
 * @returns {object} Summary with totals and component list
 */
export function getBOMSummary() {
  const sizingResult = window.lastSizingResult;
  
  if (!sizingResult) {
    return { error: "No sizing result available" };
  }

  const nodeCount = calculateNodeCount(sizingResult);
  const items = generateBOMItems(sizingResult);
  
  const summary = {
    nodeCount,
    chassisModel: sizingResult.chassisModel,
    cpuModel: sizingResult.cpuModel,
    memoryConfig: sizingResult.memoryConfig,
    diskSizeTB: sizingResult.diskSizeTB,
    disksPerNode: sizingResult.disksPerNode,
    items,
    itemCount: items.length,
    totalComponents: items.reduce((sum, item) => sum + item.qty, 0),
    componentSummary: {
      chassis: items.find(i => i.item.includes("Chassis"))?.qty || 0,
      cpus: items.find(i => i.item.includes("CPU"))?.qty || 0,
      memory: items.find(i => i.item.includes("Memory"))?.qty || 0,
      storage: items.find(i => i.item.includes("Storage"))?.qty || 0,
      nics: (items.find(i => i.item.includes("25GbE"))?.qty || 0) + (items.find(i => i.item.includes("100GbE"))?.qty || 0)
    }
  };

  // Log summary for debugging
  console.group("📋 BOM Summary");
  console.log(`Nodes: ${nodeCount}`);
  console.log(`Chassis: ${summary.componentSummary.chassis}`);
  console.log(`CPUs: ${summary.componentSummary.cpus}`);
  console.log(`Memory DIMMs: ${summary.componentSummary.memory}`);
  console.log(`Storage Drives: ${summary.componentSummary.storage}`);
  console.log(`Network NICs: ${summary.componentSummary.nics}`);
  console.log(`Total Components: ${summary.totalComponents}`);
  console.groupEnd();

  return summary;
}
