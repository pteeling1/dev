# Copilot / AI Agent Instructions for AX Calculator

This repository is a static, client-side web app (no bundler). Key folders: `js/`, `css/`, `images/`, with `index.html` as the main entry.

- **Big picture:** user-facing sizing tool that converts workload/VM requirements into cluster recommendations. The algorithmic core is in `js/sizingEngine.js`; UI glue is in `js/main.js` and `js/uihandlers.js`; visuals live in `js/visuals-debug.js` (primary) and `js/visuals.js` variants. Export features use `pptxgenjs`, `jspdf`, and `html2canvas` (see `index.html` CDN includes).

- **How the app is composed:**
  - `index.html` loads third-party libraries via CDN and `type="module"` scripts (`js/main.js`, `js/exportToPowerPoint.js`).
  - Modules export named functions; some modules expose functions on `window` for cross-file interoperability (e.g. `main.js` sets `window.initializeVisuals`, `window.updateNodeStack`, `window.drawConnections`).
  - Many files assume DOM elements exist and run on `DOMContentLoaded`.

- **Important files to inspect first:**
  - [js/main.js](js/main.js#L1) — app entry, event bindings, UI sync, developer-visible globals
  - [js/sizingEngine.js](js/sizingEngine.js#L1) — pure logic: CPU, memory, disk selection, `sizeCluster()` export
  - [js/uihandlers.js](js/uihandlers.js#L1) — DOM update helpers referenced by `main.js`
  - [js/visuals-debug.js](js/visuals-debug.js#L1) — topology drawing used by exporter/visual toggles
  - [js/exportToPowerPoint.js](js/exportToPowerPoint.js#L1) and [js/pptxExporter.js](js/pptxExporter.js#L1) — PPTX export orchestration
  - [js/rvtools-import.js](js/rvtools-import.js#L1) / [js/fileprocessor.js](js/fileprocessor.js#L1) — CSV import & parsing logic

- **Conventions & patterns (project-specific):**
  - No build system: edits are immediately visible after hosting via an HTTP server. Keep ES module syntax and `type="module"` script tags in sync.
  - Global state: `window.lastSizingResult`, `window.originalRequirements`, and similar globals are used widely — prefer updating these in tandem with DOM updates to avoid UI desync.
  - DOM-first design: many functions read DOM directly (e.g. `getSizingPayloadFromHTML()` in `sizingEngine.js`). When refactoring, maintain the same input/output surface or provide a thin adapter.
  - Logging: `console.group`, `console.table`, and `logger.js` are used for diagnostics — preserve console output when making sizing changes.
  - Exporters rely on certain functions being globally reachable (e.g. visual initializers). Avoid renaming those exports without updating `main.js` and exporter modules.

- **Dev / run instructions (explicit):**
  - Use a local HTTP server (ES modules require HTTP):
    - `python -m http.server 8000` or
    - `npx http-server -p 8080` or
    - VS Code Live Server extension
  - Open `http://localhost:8000/index.html` (or configured port). Do not rely on `file://` for module-based scripts.
  - There are no automated tests or build steps. CI deploys via GitHub Actions to Azure Static Web Apps — see `.github/workflows/azure-static-web-apps-thankful-coast-075a8e20f.yml`.

- **Common change-impact checklist for PRs:**
  - If altering sizing logic, run the UI flow: open Requirements modal → choose mode → Calculate; verify `window.lastSizingResult` and the cluster summary table.
  - If changing function names in modules, update all imports and any `window.` exposures in `js/main.js` and exporters.
  - If adding third-party libs, prefer CDN entries in `index.html` and verify `defer`/`type="module"` ordering.
  - Keep `sizingEngine.js` pure where possible; any DOM reads should remain in `getSizingPayloadFromHTML()`.

- **Debug tips / quick searches:**
  - Search for `window.lastSizingResult` to find stateful usage.
  - Inspect CPU/memory lists in [js/cpuData.js](js/cpuData.js#L1) and hardware constraints in [js/hardwareConfig.js](js/hardwareConfig.js#L1).
  - Use browser console to view the sizing logs (sizing engine prints tables/groups).

If anything here is unclear or you want additional examples (small refactor suggestions, unit test scaffold, or adding a lightweight dev server script), tell me which area to expand. I'll iterate quickly.
