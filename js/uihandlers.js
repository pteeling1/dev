import { calculateUsableStorage } from './storageCalculator.js'
import { convertTBtoTiB } from './utils.js';
import { drawStorageChart } from "./charts.js"; // Make sure this import is at the top of the file


export function updateNodeImage() {
  const nodeType = document.querySelector('input[name="nodeType"]:checked')?.value;
  const nodeImage = document.getElementById("nodeImage");

 

  const imageMap = {
    "AX 660": "660.png",
    "AX 670": "670.png",
    "AX 760": "760.png",
    "AX 770": "770.png",
    "AX-4510c": "4510.avif",
    "AX-4520c": "4520.jpg"
  };

  const imageFile = imageMap[nodeType];
  const imagePath = imageFile ? `./images/${imageFile}` : null;

  if (nodeImage && imagePath) {
   nodeImage.src = imagePath;
    nodeImage.alt = `${nodeType} diagram`;
    nodeImage.classList.remove("d-none");
  } else {
    // Image not set (missing path or element) — silently ignore in production
  }
}


export function updateDiskLimits() {
  const nodeType = document.querySelector('input[name="nodeType"]:checked')?.value;
  const diskSlider = document.getElementById("disks");
  const diskValueLabel = document.getElementById("diskValue");
  const diskMinLabel = document.getElementById("diskMin");
  const diskMaxLabel = document.getElementById("diskMax");

  if (!diskSlider || !nodeType) return;

  // Node-specific disk limits
  const limits = {
    "AX 660": [2, 10],
    "AX 670": [2, 16],
    "AX 760": [2, 24],
    "AX 770": [2, 16],
    "AX-4510c": [2, 4],
    "AX-4520c": [6, 12]
  };

  const [min, max] = limits[nodeType] || [4, 24];
  diskSlider.min = min;
  diskSlider.max = max;

  // Ensure current value is clamped within new range
  if (parseInt(diskSlider.value, 10) < min) diskSlider.value = min;
  if (parseInt(diskSlider.value, 10) > max) diskSlider.value = max;

  if (diskValueLabel) diskValueLabel.textContent = diskSlider.value;
  if (diskMinLabel) diskMinLabel.textContent = min;
  if (diskMaxLabel) diskMaxLabel.textContent = max;
}

export function updateResiliencyOptions() {
  const resiliencySelect = document.getElementById("resiliency");
  resiliencySelect.innerHTML = "";

  const options = ["2-way", "3-way"];
  options.forEach(mode => {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = mode;
    resiliencySelect.appendChild(opt);
  });

  resiliencySelect.value = "3-way";
}

export function updateStorage() {
  const nodes = parseInt(document.getElementById("nodes")?.value || "1", 10);
  const disks = parseInt(document.getElementById("disks")?.value || "1", 10);
  const diskSize = parseFloat(document.getElementById("diskSize")?.value || "1");
  const resiliency = document.getElementById("resiliency")?.value || "3-way";
  const nodeType = document.querySelector('input[name="nodeTypeCalc"]:checked')?.value || "AX 760";
  const memorySize = parseInt(document.getElementById("memorySize")?.value || "512", 10);
  const cpuModel = document.getElementById("cpuChoice")?.value;

  const results = calculateUsableStorage(
    nodes,
    disks,
    diskSize,
    resiliency,
    nodeType,
    memorySize,
    cpuModel
  );
  
  const outputDiv = document.getElementById("output");
  if (outputDiv) {
  const totalGHzDisplay = Number.isFinite(Number(results.totalGHz))
    ? Math.round(Number(results.totalGHz))
    : results.totalGHz;

  outputDiv.innerHTML = `
    <strong>Total Nodes:</strong> ${results.nodeCount}<br>
    <strong>Total Cores:</strong> ${results.totalCores}<br>
    <strong>Total GHz:</strong> ${totalGHzDisplay} GHz<br>
    <strong>Total Memory:</strong> ${results.totalMemoryGB} GB<br>
    <strong>Raw Storage:</strong> ${results.rawTB} TB<br>
    <strong>Usable Storage:</strong> ${results.usableTB} TB (${results.usableTiB} TiB)<br>
    <strong>Resiliency Overhead:</strong> ${results.resiliencyTB} TB
  `;
}

drawStorageChart(
  parseFloat(results.usableTiB),
  parseFloat(results.reserveTiB),
  parseFloat(results.resiliencyTiB)
);
}