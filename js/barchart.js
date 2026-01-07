export function renderRelativeFillBarChart(payload, result) {
  const container = document.getElementById("relativeFillBarChart");
  if (!container) return;
//console.log("🧪 CPU:", payload.totalCPU, "vs", result.totalCores);
//console.log("🧪 RAM:", payload.totalRAM, "vs", result.totalMemoryGB);
//console.log("🧪 Storage:", payload.totalStorage, "vs", result.usableTiB);

  container.innerHTML = ""; // Clear previous chart

  const isGHzMode = payload.totalCPU === 0 && payload.totalGHz > 0;

const data = [
  {
    label: isGHzMode ? "CPU (GHz)" : "CPU (Cores)",
    requested: isGHzMode ? payload.totalGHz : payload.totalCPU,
    providing: isGHzMode ? result.totalUsableGHz : result.totalCores,
    unit: isGHzMode ? "GHz" : "cores"
  },

    { label: "Memory", requested: payload.totalRAM, providing: result.totalMemoryGB, unit: "GB" },
    { label: "Storage", requested: payload.totalStorage, providing: parseFloat(result.usableTiB), unit: "TiB" }
  ];

  const barHeight = 40;
  const barWidth = 300;
  const chartPadding = 20;
  const labelWidth = 120;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  const svgWidth = labelWidth + barWidth + chartPadding * 2;
const svgHeight = data.length * (barHeight + 15) + chartPadding * 2;

const title = document.createElementNS(svgNS, "text");
title.setAttribute("x", chartPadding);
title.setAttribute("y", chartPadding -10);
title.setAttribute("text-anchor", "start");
title.setAttribute("class", "text-base font-semibold fill-gray-700");
title.textContent = "Utilization of Available Resources";
svg.appendChild(title);


svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
svg.style.width = "100%";
svg.style.height = "auto";
svg.style.overflow = "visible";

  data.forEach((item, index) => {
    if (!isFinite(item.providing) || item.providing <= 0) {
        return;
  }


    const y = chartPadding + index * (barHeight + 15);
    const requiredPercentage = (item.requested / item.providing) * 100;
    const requiredWidth = (requiredPercentage / 100) * barWidth;
    const headroomPercentage = 100 - requiredPercentage;

    const group = document.createElementNS(svgNS, "g");

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", chartPadding);
    label.setAttribute("y", y + barHeight / 2);
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("class", "text-sm font-medium fill-gray-700");
    label.textContent = item.label;
    group.appendChild(label);

    const background = document.createElementNS(svgNS, "rect");
    background.setAttribute("x", chartPadding + labelWidth);
    background.setAttribute("y", y);
    background.setAttribute("width", barWidth);
    background.setAttribute("height", barHeight);
    background.setAttribute("fill", "#f3f4f6");
    background.setAttribute("stroke", "#d1d5db");
    background.setAttribute("stroke-width", "1");
    background.setAttribute("rx", "4");
    group.appendChild(background);

    const requiredBar = document.createElementNS(svgNS, "rect");
    requiredBar.setAttribute("x", chartPadding + labelWidth);
    requiredBar.setAttribute("y", y);
    requiredBar.setAttribute("width", requiredWidth);
    requiredBar.setAttribute("height", barHeight);
    requiredBar.setAttribute("fill", "#0d6efd");
    requiredBar.setAttribute("rx", "4");
    group.appendChild(requiredBar);

   const pctLabel = document.createElementNS(svgNS, "text");

// Center the label horizontally inside the bar
const labelX = chartPadding + labelWidth + Math.min(requiredWidth / 2, barWidth - 20);

pctLabel.setAttribute("x", labelX);
pctLabel.setAttribute("y", y + barHeight / 2);
pctLabel.setAttribute("dominant-baseline", "middle");
pctLabel.setAttribute("text-anchor", "middle");

// Use white text if bar is wide enough, otherwise dark text outside
const useInsideLabel = requiredWidth > 40;
pctLabel.setAttribute("fill", useInsideLabel ? "#ffffff" : "#333333");
pctLabel.textContent = `${requiredPercentage.toFixed(0)}%`;

group.appendChild(pctLabel);

    svg.appendChild(group);
  });

  container.appendChild(svg);
}