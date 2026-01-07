// js/memoryOptions.js

document.addEventListener("DOMContentLoaded", () => {
  const memorySizes = [
    128, 192, 256, 384, 512, 768, 1024,
    1152, 1536, 2048, 2304, 3072, 4096, 6144, 8192
  ];

  const memorySelect = document.getElementById("memorySize");

  if (memorySelect) {
    memorySizes.forEach(size => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = `${size} GB`;
      memorySelect.appendChild(option);
    });

    // Set default selection
    memorySelect.value = "1024";
  }
});
