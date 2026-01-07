let storageChartInstance;

export function drawStorageChart(usableTiB, reserveTiB, resiliencyTiB) {
  const canvas = document.getElementById("storageChart");
  if (!canvas) {
    console.warn("📉 storageChart canvas not found.");
    return;
  }

  const PIXEL_SIZE = 250;

  // 🔒 Lock internal render resolution and visible size
  canvas.width = PIXEL_SIZE;
  canvas.height = PIXEL_SIZE;
  canvas.style.width = `${PIXEL_SIZE}px`;
  canvas.style.height = `${PIXEL_SIZE}px`;

  const ctx = canvas.getContext("2d");

  if (storageChartInstance) {
    storageChartInstance.destroy();
  }

  storageChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Usable (TiB)", "Reserve (TiB)", "Resiliency (TiB)"],
      datasets: [{
        data: [usableTiB, reserveTiB, resiliencyTiB],
        backgroundColor: [
          "#0d6efd", // Usable – deep blue
          "#66b2ff", // Reserve – medium blue
          "#cce5ff"  // Resiliency – light blue
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: ctx => {
              const label = ctx.label || '';
              const value = ctx.parsed;
              return `${label}: ${value?.toFixed(2)} TiB`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea: { width, height } } = chart;
        const usable = chart.data.datasets[0].data[0];
        if (!usable || isNaN(usable)) return;

        ctx.save();
        ctx.fillStyle = "#0d6efd";
        ctx.font = " 16px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${usable.toFixed(2)} TiB`, width / 2, height / 2);
        ctx.restore();
      }
    }]
  });
}