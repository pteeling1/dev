/**
 * Light Editorial Theme PPTX Exporter Setup
 * Handles diagram capture and export for light-themed presentations
 */

import { exportToPowerPointLight } from "./exportToPowerPointLight.js";

export function setupPPTXExportLight({ 
  buttonId = "exportPPTXLight", 
  diagramSelector = ".topology-wrapper" 
} = {}) {
  const exportBtn = document.getElementById(buttonId);
  if (!exportBtn) return;

  // ✅ Remove previous listeners by cloning the button
  const freshBtn = exportBtn.cloneNode(true);
  exportBtn.parentNode.replaceChild(freshBtn, exportBtn);

  freshBtn.addEventListener("click", () => {
    const diagramPanel = document.querySelector(diagramSelector);
    const liveResult = window.lastSizingResult;
    const liveRequirements = window.originalRequirements;

    if (!diagramPanel) {
      console.warn("⚠️ Diagram panel not found. Proceeding without diagram.");
      exportToPowerPointLight(liveResult, liveRequirements, null);
      return;
    }

    // ✅ Use Promise-based approach for diagram preparation
    prepareDiagramForCapture(diagramPanel, liveResult, liveRequirements);
  });
}

function prepareDiagramForCapture(diagramPanel, liveResult, liveRequirements) {
  const wasHidden = diagramPanel.classList.contains("d-none");
  
  console.log("🔧 Starting diagram preparation for light export...");
  
  // ✅ Ensure diagram is visible
  if (wasHidden) {
    diagramPanel.classList.remove("d-none");
  }

  // ✅ Force layout recalculation
  void diagramPanel.offsetHeight;

  // ✅ Trigger all diagram rendering functions
  refreshDiagramVisuals()
    .then(() => {
      console.log("🎨 Visual refresh completed");
      return waitForDiagramReady(diagramPanel);
    })
    .then((isReady) => {
      if (!isReady) {
        console.warn("⚠️ Diagram failed to render properly. Proceeding without diagram.");
        if (wasHidden) diagramPanel.classList.add("d-none");
        exportToPowerPointLight(liveResult, liveRequirements, null);
        return;
      }

      // ✅ Check if html2canvas is available
      if (typeof html2canvas === 'undefined') {
        console.warn("⚠️ html2canvas not available. Proceeding without diagram.");
        if (wasHidden) diagramPanel.classList.add("d-none");
        exportToPowerPointLight(liveResult, liveRequirements, null);
        return;
      }

      // ✅ Capture the diagram
      return captureDiagramImage(diagramPanel, liveResult, liveRequirements, wasHidden);
    })
    .catch((error) => {
      console.error("❌ Diagram preparation failed:", error);
      if (wasHidden) diagramPanel.classList.add("d-none");
      exportToPowerPointLight(liveResult, liveRequirements, null);
    });
}

function refreshDiagramVisuals() {
  // ✅ Return a Promise for proper chaining
  return new Promise((resolve) => {
    try {
      console.log("🔄 Refreshing diagram visuals for light export...");
      
      // Force re-initialization of visuals with safer checks
      if (window.initializeVisuals && typeof window.initializeVisuals === "function") {
        window.initializeVisuals();
        console.log("✅ initializeVisuals called");
      }
      
      if (window.updateNodeStack && typeof window.updateNodeStack === "function") {
        window.updateNodeStack();
        console.log("✅ updateNodeStack called");
      }
      
      if (window.drawConnections && typeof window.drawConnections === "function") {
        window.drawConnections();
        console.log("✅ drawConnections called");
      }

      // ✅ Longer delay for DOM updates, animations, and rendering
      setTimeout(() => {
        console.log("✅ Visual refresh delay completed");
        
        // ✅ Force a layout recalculation
        const diagramPanel = document.querySelector('.topology-wrapper');
        if (diagramPanel) {
          void diagramPanel.offsetHeight;
          void diagramPanel.offsetWidth;
        }
        
        resolve();
      }, 250);
    } catch (error) {
      console.warn("⚠️ Some visual functions failed:", error);
      resolve(); // Continue anyway
    }
  });
}

function waitForDiagramReady(diagramPanel) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 3;
    const attemptDelay = 100;

    function checkDiagram() {
      attempts++;
      console.log(`📏 Checking diagram readiness (attempt ${attempts}/${maxAttempts})`);
      
      const bounds = diagramPanel.getBoundingClientRect();
      
      // ✅ Check if diagram has meaningful dimensions
      if (bounds.width >= 100 && bounds.height >= 100) {
        const hasVisibleChildren = checkForVisibleChildren(diagramPanel);
        const hasRenderedContent = checkForRenderedContent(diagramPanel);
        
        if (hasVisibleChildren && hasRenderedContent) {
          console.log(`✅ Diagram ready: ${bounds.width}x${bounds.height} with rendered content`);
          setTimeout(() => resolve(true), 200);
          return;
        }
      }
      
      console.log(`⏳ Diagram not ready yet: ${bounds.width}x${bounds.height} (attempt ${attempts})`);
      
      if (attempts >= maxAttempts) {
        console.warn("❌ Diagram failed to become ready after all attempts");
        resolve(false);
        return;
      }

      if (attempts % 2 === 0) {
        console.log("🔄 Re-triggering diagram rendering...");
        refreshDiagramVisuals().then(() => {
          setTimeout(checkDiagram, attemptDelay);
        });
      } else {
        setTimeout(checkDiagram, attemptDelay);
      }
    }

    checkDiagram();
  });
}

function checkForVisibleChildren(diagramPanel) {
  try {
    const contentElements = diagramPanel.querySelectorAll('svg, canvas, .node, .connection, .topology-element, div[style*="position"]');
    
    if (contentElements.length === 0) {
      console.warn("⚠️ No diagram content elements found");
      return false;
    }

    let visibleCount = 0;
    contentElements.forEach(el => {
      const bounds = el.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        visibleCount++;
      }
    });

    console.log(`📊 Found ${visibleCount}/${contentElements.length} visible diagram elements`);
    return visibleCount > 0;
  } catch (error) {
    console.warn("⚠️ Error checking visible children:", error);
    return false;
  }
}

function checkForRenderedContent(diagramPanel) {
  try {
    const svgElements = diagramPanel.querySelectorAll('svg');
    let hasContent = false;
    
    svgElements.forEach(svg => {
      const paths = svg.querySelectorAll('path, rect, circle, line, g');
      if (paths.length > 0) {
        paths.forEach(path => {
          const computedStyle = window.getComputedStyle(path);
          if (computedStyle.display !== 'none' && 
              computedStyle.visibility !== 'hidden' &&
              computedStyle.opacity !== '0') {
            hasContent = true;
          }
        });
      }
    });

    const positionedElements = diagramPanel.querySelectorAll('div[style*="position"]');
    positionedElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.display !== 'none' && 
          computedStyle.visibility !== 'hidden' &&
          computedStyle.opacity !== '0' &&
          el.getBoundingClientRect().width > 0) {
        hasContent = true;
      }
    });

    console.log(`🎨 Rendered content check: ${hasContent ? 'PASS' : 'FAIL'}`);
    return hasContent;
  } catch (error) {
    console.warn("⚠️ Error checking rendered content:", error);
    return true;
  }
}

function captureDiagramImage(diagramPanel, liveResult, liveRequirements, wasHidden) {
  return new Promise((resolve) => {
    try {
      console.log("📸 Starting diagram capture for light export...");
      
      const bounds = diagramPanel.getBoundingClientRect();
      if (bounds.width < 50 || bounds.height < 50) {
        throw new Error(`Diagram too small: ${bounds.width}x${bounds.height}`);
      }
      
      html2canvas(diagramPanel, {
        backgroundColor: "#fff",
        useCORS: true,
        scale: 2
      })
        .then((canvas) => {
          const DPI = 96;
          console.log("🖼️ Canvas dimensions (px):", canvas.width, canvas.height);
          console.log("📏 Canvas dimensions (in):", (canvas.width / DPI).toFixed(2), "×", (canvas.height / DPI).toFixed(2));
          
          const diagramImage = canvas.toDataURL("image/jpeg");

          if (diagramImage.length < 1000) {
            throw new Error("Captured image appears to be empty or too small");
          }
          
          console.log("✅ Diagram captured successfully");
          
          if (wasHidden) {
            diagramPanel.classList.add("d-none");
          }
          
          exportToPowerPointLight(liveResult, liveRequirements, diagramImage);
          resolve();
        })
        .catch((error) => {
          throw error;
        });
      
    } catch (error) {
      console.error("❌ Diagram capture failed:", error);
      
      if (wasHidden) {
        diagramPanel.classList.add("d-none");
      }
      
      exportToPowerPointLight(liveResult, liveRequirements, null);
      resolve();
    }
  });
}
