# ISSUE-05: Mobile Layout and PNG Export

## Summary

Adapt the visualization for mobile viewports below 768px wide and implement a PNG export function that captures the chart and title as a clean, intentional-looking image. This is the final polish issue and should be the last implemented.

---

## Background

The chart was designed for a desktop canvas. On mobile, the right-side detail panel, filter controls, and chart area need to reflow to remain usable. The detail panel in particular — fixed at 360px wide on desktop — must become full-width on small screens and ideally slide up from the bottom rather than in from the side.

The PNG export is a common request for data visualization products. The key constraint is that it should look intentional: the exported image should include the chart, the Fischer branding/title, and a clean background — not a screenshot artifact with partial UI chrome visible.

---

## Acceptance Criteria

**Mobile Layout**
- [ ] At viewports below 768px, the detail panel switches from a right-side fixed panel (360px wide) to a bottom sheet that slides up from the bottom of the viewport, full-width
- [ ] Filter controls (governance slider, Fischer Active toggle, mode buttons) reflow to a column layout or are accessible via a collapsed control bar on mobile
- [ ] The chart canvas retains a usable minimum height (at minimum 300px) on small screens and does not overflow horizontally
- [ ] The mute button and ambient hum toggle remain accessible on mobile (not hidden off-screen or overlapped by other controls)
- [ ] Touch events on chart bubbles trigger the same detail panel behavior as click events on desktop — no separate touch-specific code path is required if Chart.js handles touch natively, but verify this is the case
- [ ] The `file://` protocol warning message (from ISSUE-01) is readable on mobile

**PNG Export**
- [ ] A clearly labeled "Export PNG" button is visible in the UI on both desktop and mobile
- [ ] Clicking the button generates and downloads a PNG image named `fischer-ai-governance-[YYYY-MM-DD].png` using today's date
- [ ] The exported image includes: the chart area (all 13 bubbles as currently rendered), the Fischer title/branding text, and the dark background — framed as a complete, standalone image
- [ ] The exported image does NOT include: the detail panel, filter controls, mode buttons, mute toggles, or any other UI chrome
- [ ] The export captures the chart at its current rendered state — if filters are active (bubbles faded or hidden), the export reflects that state
- [ ] The export works by drawing onto an offscreen `<canvas>`, compositing the chart canvas and title text, and calling `canvas.toDataURL('image/png')` — no third-party screenshot libraries
- [ ] The exported image has a minimum resolution of 1200px wide (upscale via `devicePixelRatio` or a fixed scale factor if needed for quality)
- [ ] Export button is not present in the exported image

---

## Technical Notes

- **Mobile bottom sheet:** Use a CSS class toggle (e.g., `detail-panel--mobile`) applied via a media query or a `matchMedia` listener in JS. The bottom sheet variant uses `position: fixed; bottom: 0; left: 0; width: 100%; transform: translateY(100%)` when closed and `transform: translateY(0)` when open, with a `transition: transform 300ms ease`.

- **Responsive chart sizing:** Chart.js is responsive by default when `responsive: true` and `maintainAspectRatio: false` are set and the parent container has a defined height. On mobile, set the parent container height explicitly via a CSS media query (e.g., `height: 340px` at `<768px`).

- **Touch on Chart.js:** Chart.js 4.x handles touch events natively for hover and click. Test that the `onClick` callback fires on tap. If it does not, add a `touchend` listener as a fallback that calls the same detail panel open logic.

- **PNG export — overlay canvas compositing:**
  1. Create an offscreen canvas at the target output size (e.g., 1600 × 900).
  2. Fill with `--bg` color (`#0d0f12`).
  3. Draw the title text using `fillText()` with the Syne font (note: web fonts must be loaded before drawing to canvas — use `document.fonts.ready` to confirm).
  4. Draw the Chart.js canvas via `ctx.drawImage(chart.canvas, ...)` positioned below the title.
  5. Do NOT draw the overlay canvas (it contains ephemeral hover effects, not data).
  6. Call `canvas.toDataURL('image/png')`, create an `<a>` tag, set `download` attribute, and programmatically click it.

- **Export filename with date:**
  ```js
  const date = new Date().toISOString().slice(0, 10); // "2026-04-01"
  const filename = `fischer-ai-governance-${date}.png`;
  ```

- **Font rendering in export canvas:** The `drawImage` approach copies rasterized pixel data from the Chart.js canvas, so Chart.js labels (if any) are included. Title text drawn via `fillText` on the offscreen canvas requires the font to be loaded. Wrap the export logic in `document.fonts.ready.then(...)` or check `document.fonts.check('16px Syne')` before drawing.

- **Overlay canvas exclusion:** When exporting, explicitly skip the overlay canvas (`<canvas id="overlay-canvas">`). Only use `chart.canvas` as the source for chart pixel data.

- **High-DPI export:** Multiply the offscreen canvas dimensions by `window.devicePixelRatio` and scale the context accordingly to produce a crisp export on HiDPI screens:
  ```js
  const dpr = window.devicePixelRatio || 1;
  offscreen.width = targetWidth * dpr;
  offscreen.height = targetHeight * dpr;
  ctx.scale(dpr, dpr);
  ```

---

## Out of Scope

- SVG export
- PDF export
- Print stylesheet (`@media print`)
- Exporting filter control state or legend into the image
- Custom filename input by the user
- Image compression or format options (JPEG, WebP)

---

## Definition of Done

On a mobile viewport (or browser DevTools responsive mode at 375px width), the detail panel opens as a full-width bottom sheet and all filter controls are accessible. On desktop, clicking "Export PNG" downloads a clean, dark-background image of the chart with the Fischer title, named with today's date. The exported image looks intentional — it could be dropped directly into a presentation or report without editing. No UI chrome or browser artifacts are visible in the export.
