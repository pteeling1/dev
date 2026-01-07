import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";
import { cpuList } from "./cpuData.js";
import { calculateUsableStorage } from "./storageCalculator.js";

export function setupPDFExport({
  buttonId = "exportPDF",
  chartId = "storageChart",
  diagramSelector = ".diagram-panel"
} = {}) {
  const exportBtn = document.getElementById(buttonId);
  if (!exportBtn) return;

  exportBtn.addEventListener("click", () => {
    const authorName = prompt("Enter your name (required):");
    if (!authorName?.trim()) {
      alert("Author name is required to generate the document.");
      return;
    }

    const projectName = prompt("Enter project name (optional):") || "";
    const filename = projectName.trim() ? `${projectName}_Report.pdf` : "AX_Calculator_Report.pdf";
    const now = new Date().toLocaleString();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Get live DOM values
    const nodeCount = parseInt(document.getElementById("nodeSlider")?.value || "1", 10);
    const memorySize = parseInt(document.getElementById("memorySize")?.value || "512", 10);
    const disks = parseInt(document.getElementById("disks")?.value || "1", 10);
    const diskSize = parseFloat(document.getElementById("diskSize")?.value || "1");
    const resiliency = document.getElementById("resiliency")?.value || "3-way";
    const cpuModel = document.getElementById("cpuChoice")?.value || "Intel Xeon";
    const nodeType = document.querySelector('input[name="nodeType"]:checked')?.value || "AX 760";

    const selectedCPU = cpuList.find(cpu => cpu.model === cpuModel);
    const coresPerCPU = selectedCPU?.cores || 0;
    const baseGHz = selectedCPU?.base_clock_GHz || 0;

    const coresPerNode = coresPerCPU * 2;
    const totalCores = coresPerNode * nodeCount;
    const totalGHz = (baseGHz * totalCores).toFixed(2);
    const results = calculateUsableStorage(nodeCount, disks, diskSize, resiliency, nodeType, memorySize, cpuModel);
    const usableTiB = parseFloat(results.usableTiB);

    // Page 1 — Header
    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text("AX Configuration Report", 20, y);
    if (projectName.trim()) {
      doc.setFontSize(12).setFont("helvetica", "normal");
      doc.text(`Project: ${projectName}`, pageWidth - 20, y, { align: "right" });
    }

    y += 14;
    doc.setDrawColor(160).setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 6;

    // Configuration Summary
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("Configuration Summary", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal").setFontSize(10);

    const configItems = [
      ["Node Count", nodeCount],
      ["Node Type", nodeType],
      ["CPU Model", cpuModel],
      ["CPU Cores per CPU", coresPerCPU],
      ["CPU Base Clock", `${baseGHz} GHz`],
      ["CPUs per Node", "2"],
      ["Memory per Node", `${memorySize} GB`],
      ["Disks per Node", `${disks} × ${diskSize} TB`],
      ["Resiliency", resiliency]
    ];
    configItems.forEach(([label, value]) => {
      doc.text(`${label}:`, 20, y);
      doc.text(String(value), 100, y);
      y += 6;
    });

    // Cluster Totals — aligned with configItems
    y += 4;
    doc.setFont("helvetica", "bold").text("Cluster Totals", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");

    const clusterItems = [
  ["Total Memory", `${results.totalMemoryGB} GB`],
  ["Total Cores", totalCores],
  ["Total GHz", `${totalGHz} GHz`],
  ["Usable Storage", isFinite(usableTiB) ? `${usableTiB.toFixed(2)} TiB` : "—"],
  ["Connectivity Required", `${window.cableCount} × ${window.cableLabel}`]
  
];
    clusterItems.forEach(([label, value]) => {
      doc.text(`${label}:`, 20, y);
      doc.text(String(value), 100, y);
      y += 8;

      if (label === "Connectivity Required") {
  doc.setFontSize(8).setTextColor(100);
  doc.text("The number of cables/SFP's does not include any inter-switch links", 20, y);
  doc.setFontSize(10).setTextColor(0); // reset font for next content
  y += 6;
}

    });

    // Storage Chart
    y += 10;
    doc.setFont("helvetica", "bold").text("Storage Chart", 20, y);
    y += 10;

    const chartCanvas = document.getElementById(chartId);
    if (chartCanvas) {
      const chartImage = chartCanvas.toDataURL("image/png");
      const imgWidth = 80;
      const imgHeight = 80;
      const xCenter = (pageWidth - imgWidth) / 2;
      doc.addImage(chartImage, "PNG", xCenter, y, imgWidth, imgHeight);
      y += imgHeight + 10;
      doc.text("Figure 1: Storage Configuration Chart", 20, y);
      y += 12;
    }

    // Page 2 — Diagram
    doc.addPage();
    y = 20;
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("Topology Layout", 20, y);
    y += 10;

    const diagramPanel = document.querySelector(diagramSelector);
    if (!diagramPanel) {
      doc.text("Diagram not found.", 20, y + 20);
      doc.save(filename);
      return;
    }

    setTimeout(() => {
      html2canvas(diagramPanel, {
        backgroundColor: "#fff",
        useCORS: true,
        scale: 2
      }).then(canvas => {
        const aspectRatio = canvas.height / canvas.width || 0.6;
        const imgData = canvas.toDataURL("image/jpeg");
        const availableWidth = pageWidth - 40;
        const imgWidth = availableWidth;
        const imgHeight = imgWidth * aspectRatio;
        const xCenter = (pageWidth - imgWidth) / 2;

        doc.addImage(imgData, "JPEG", xCenter, y, imgWidth, imgHeight);
        y += imgHeight + 10;

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFont("helvetica", "normal").setFontSize(10);
          doc.text(`Generated by ${authorName} on ${now}`, 20, pageHeight - 10);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 50, pageHeight - 10);
        }

        doc.save(filename);
      }).catch(err => {
        console.warn("❌ Diagram capture failed:", err);
        doc.save(filename);
      });
    }, 300);
  });
}