# Fischer AI Governance Interactive — Issue Index

This directory contains the development issues for transforming the Fischer AI Governance chart from a static single-file HTML visualization into a structured, interactive, multi-module data product.

---

## Suggested Implementation Order

Issues are sequenced so that each one builds on a stable foundation provided by the previous. Do not begin an issue until its predecessors are merged and verified.

| Order | Issue | Title | Key Dependency |
|-------|-------|-------|----------------|
| 1 | [ISSUE-01](ISSUE-01-project-scaffold-and-module-structure.md) | Project Scaffold and Module Structure | None — start here |
| 2 | [ISSUE-02](ISSUE-02-visual-effects-and-animation.md) | Visual Effects and Animation | ISSUE-01 (overlay canvas, module files) |
| 3 | [ISSUE-03](ISSUE-03-sound-design-and-audio-system.md) | Sound Design and Audio System | ISSUE-01 (module files), can parallel ISSUE-02 |
| 4 | [ISSUE-04](ISSUE-04-interactivity-filters-and-detail-panel.md) | Interactivity, Filters, and Detail Panel | ISSUE-01, ISSUE-02 (overlay canvas for focus highlight), ISSUE-03 (mode chimes) |
| 5 | [ISSUE-05](ISSUE-05-mobile-layout-and-png-export.md) | Mobile Layout and PNG Export | All prior issues complete |

---

## Issue Summaries

### ISSUE-01 — Project Scaffold and Module Structure
Refactor the single-file HTML into the multi-file ES module structure (`js/chart-setup.js`, `js/animations.js`, `js/audio.js`, `js/interactions.js`, `js/main.js`). Establish the `file://` protocol warning, pin CDN versions, define the single source of truth for the 13 data points, and confirm the chart renders identically in a local server context. No user-visible feature changes.

### ISSUE-02 — Visual Effects and Animation
Add all motion to the visualization: staggered bubble entrance (80–120ms delay, scale+fade), hover ripple/particle effects on an overlay canvas, governance ring pulse (speed proportional to governance score), and quadrant background glow on hover. Includes overlay canvas co-registration and resize handling.

### ISSUE-03 — Sound Design and Audio System
Implement a fully synthesized (Web Audio API only) sound layer: quadrant hover tones (C4/E4/G4/B4), governance mode switch chimes, an opt-in ambient hum with its own toggle, and a global mute control. AudioContext initializes lazily on first user gesture. No audio files, no audio CDN libraries.

### ISSUE-04 — Interactivity, Filters, and Detail Panel
Build the interaction layer: click-to-open detail panel (360px desktop / full-width mobile) showing company data including explicit Fischer active status, governance threshold slider (1–10), "Fischer Active Only" toggle, three governance view mode buttons (ring/glow/size), and full keyboard navigation via a hidden DOM focusable layer. Filters compose correctly and transitions are smooth.

### ISSUE-05 — Mobile Layout and PNG Export
Adapt the UI for viewports below 768px (bottom-sheet detail panel, reflowed controls, minimum chart height) and implement PNG export that produces a clean, intentional-looking image — chart + Fischer title on dark background, no UI chrome, filename includes today's date. High-DPI aware.

---

## Cross-Cutting Concerns

These concerns span multiple issues and should be kept in mind throughout implementation:

- **Source fidelity:** The 13 data points, dark theme colors, Fischer branding, Chart.js bubble chart, and existing tooltip must be preserved exactly. The refactor must not feel like a refactor.
- **No build tools:** CDN only. No npm, no Webpack, no Vite, no TypeScript compilation. The project must run with just a local static file server.
- **No frameworks:** No React, Vue, Angular, or similar. Vanilla JS ES modules only.
- **ES module server requirement:** The project will not run via `file://`. A local server is required (VS Code Live Server, `npx serve`, or `python -m http.server`). ISSUE-01 implements a warning for this.
- **Performance:** Animation and audio must not degrade chart interaction performance. Ripple loops use `requestAnimationFrame` and are bounded. Chart.js `update()` calls are batched where possible.
- **Module boundaries:** Each JS file should be coherent and ownable by a single developer. Avoid cross-module mutation of shared state — pass state as function arguments.

---

## File Locations

All issues are in:
```
C:\Users\Rob\OneDrive\Training\fischer-ai-governance-interactive\issues\
```

Project root:
```
C:\Users\Rob\OneDrive\Training\fischer-ai-governance-interactive\
```
