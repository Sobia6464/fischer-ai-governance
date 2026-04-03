# ISSUE-01: Project Scaffold and Module Structure

## Summary

Refactor the existing single-file HTML application into a structured multi-file ES module project. Establish the file layout, shared constants, CDN dependencies, and the local development server requirement before any feature work begins.

---

## Background

The current project is a self-contained `index.html` file. All styles, scripts, and data live in one place. The optimized version requires a clean module split across `css/styles.css`, `js/chart-setup.js`, `js/animations.js`, `js/audio.js`, `js/interactions.js`, and `js/main.js`.

ES modules use `import`/`export` syntax, which browsers enforce with CORS headers — meaning the project **will not run via `file://` protocol**. A local development server (e.g., `npx serve`, VS Code Live Server, or Python's `http.server`) is required from this point forward.

This issue covers the structural foundation everything else depends on. No visual or behavioral changes are expected from the user's perspective when this issue is complete — the chart should render identically to the original.

---

## Acceptance Criteria

- [ ] Directory structure matches the spec exactly:
  ```
  fischer-ai-governance-interactive/
  ├── index.html
  ├── css/
  │   └── styles.css
  └── js/
      ├── chart-setup.js
      ├── animations.js
      ├── audio.js
      ├── interactions.js
      └── main.js
  ```
- [ ] `index.html` loads Chart.js and Google Fonts via CDN only — no local copies, no npm, no build step
- [ ] All `<script>` tags in `index.html` use `type="module"` and reference `js/main.js` as the single entry point
- [ ] `index.html` contains a visible, styled fallback message that displays only when the page is opened via `file://` protocol (detected via `window.location.protocol`)
- [ ] CSS custom properties (`--bg`, `--surface`, `--accent`, etc.) are defined in `css/styles.css` under `:root` and match the original values exactly (`--bg: #0d0f12`, `--surface: #14171c`, `--accent: #c8392b`)
- [ ] Syne and DM Mono fonts are loaded from Google Fonts CDN with `display=swap`
- [ ] The 13 data points are defined once, in a single exported constant (e.g., `export const COMPANIES` in `js/chart-setup.js`), and referenced from all other modules — no duplication
- [ ] CDN library versions are pinned (not `@latest`) and documented in a comment block at the top of `index.html`
- [ ] Chart renders correctly in a local server context — same visual output as the original single-file version
- [ ] No frameworks (React, Vue, etc.), no bundlers (Webpack, Vite, etc.), no TypeScript

---

## Technical Notes

- **file:// detection:** Use `if (window.location.protocol === 'file:')` in a non-module `<script>` tag that runs before the module entry point. Display a `<div id="file-protocol-warning">` with clear instructions for starting a local server. This script must be non-module so it executes even if ES module loading is blocked.
- **CDN versions to pin:** Chart.js `4.4.3`, at minimum. Document the exact CDN URLs and versions in a comment at the top of `index.html` so future maintainers know what to update.
- **Module boundary rationale:**
  - `chart-setup.js` — Chart.js instance creation, data definitions, chart config
  - `animations.js` — entrance animation logic, ring pulse timers
  - `audio.js` — Web Audio API context, tone generators, mute state
  - `interactions.js` — click handlers, keyboard nav, filter logic, detail panel
  - `main.js` — entry point; imports and wires all modules together, handles resize
- **Shared state:** If modules need to share the Chart.js instance or filter state, pass it as a function argument rather than using a global variable. This avoids hidden coupling between modules.
- **Google Fonts:** Load both Syne (weights 400, 600, 700) and DM Mono (weight 400) in a single `<link>` tag using the `family` query parameter.

---

## Out of Scope

- No new visual features in this issue
- No audio, interaction, or animation implementation
- No mobile layout changes
- No PNG export functionality

---

## Definition of Done

The refactored project opens in a browser via local server and renders the chart identically to the original. Opening via `file://` shows the warning message instead of a broken app. A peer reviewer can open any JS file and understand which concern it owns without reading the others. CDN versions are visible at a glance in `index.html`.
