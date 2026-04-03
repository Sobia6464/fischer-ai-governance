# ISSUE-02: Visual Effects and Animation

## Summary

Implement all visual motion and effect layers: staggered entrance animation for bubbles on load, hover-triggered particle/ripple effects on an overlay canvas, pulsing governance rings with speed tied to governance score, and quadrant background glow on hover.

---

## Background

The existing chart is static — bubbles appear instantly and there is no motion feedback for user interaction. This issue introduces the animation layer that makes the visualization feel alive and data-expressive.

All animation work lives in `js/animations.js` (ring pulses, entrance sequencing) and requires an overlay `<canvas>` element registered on top of the Chart.js canvas for hover particles and quadrant glow. The two canvases must be pixel-perfectly co-registered at all times, including on window resize.

The governance ring pulse effect is particularly important for data expression: companies with high governance scores pulse faster, making the rhythm of the visualization itself informative.

---

## Acceptance Criteria

- [ ] **Staggered entrance animation:** On initial chart render, each bubble scales from 0 to 100% and fades from 0 to 100% opacity. Delays are staggered across the 13 data points at 80–120ms intervals (consistent spacing, not random). The full entrance sequence completes within ~1.5 seconds.
- [ ] **Overlay canvas exists and is co-registered:** A second `<canvas id="overlay-canvas">` is positioned absolutely over the Chart.js canvas via CSS. Its `width`, `height`, and `left`/`top` offset are synchronized with the Chart.js canvas on mount and on every `window resize` event.
- [ ] **Hover particle/ripple effect:** When the user hovers over a bubble, a ripple or particle burst renders on the overlay canvas at that bubble's position. The effect does not modify the Chart.js canvas or interfere with Chart.js tooltip behavior.
- [ ] **Governance ring pulse:** Each bubble renders with a surrounding ring (visible in the default view mode). The ring's pulse animation speed is proportional to the bubble's governance score: a score of 10 pulses noticeably faster than a score of 1. The pulse uses a smooth sinusoidal or easing curve — not a hard blink.
- [ ] **Ring behavior in glow and size modes:** In glow mode, the governance ring is replaced by or supplemented with a colored glow halo. In size mode, the ring is either hidden or de-emphasized. Both modes use the same proportional-speed logic if rings are visible. Extrapolation of animation behavior for these modes is explicitly addressed in code comments.
- [ ] **Quadrant background glow:** The chart background is divided into four quadrants. When the user hovers over a bubble, the quadrant that bubble belongs to receives a subtle background glow on the overlay canvas. The glow fades in/out smoothly (200–400ms transition).
- [ ] **No degradation of Chart.js rendering:** The overlay canvas receives pointer events for ripple/glow triggers; it must use `pointer-events: none` so that hover and click events pass through to the underlying Chart.js canvas for tooltips and click detection.
- [ ] **Resize handling:** A `ResizeObserver` or `window resize` listener recomputes overlay canvas dimensions and position to stay locked to the Chart.js canvas. No visual drift after resize.
- [ ] **Empty/missing data graceful handling:** If a bubble's `governance` field is missing or results in an empty animation array/parameter, the animation falls back to a default pulse speed rather than throwing an error or producing `NaN`.

---

## Technical Notes

- **Overlay canvas registration:** After Chart.js renders, read `chart.canvas.getBoundingClientRect()` and the parent container's `getBoundingClientRect()` to compute the correct absolute offset. Set overlay `style.left`, `style.top`, `style.width`, `style.height` to match. Repeat this on resize.
- **pointer-events:** The overlay canvas must have `pointer-events: none` in CSS. Mouse events should be listened to on the Chart.js canvas or the chart container, not the overlay.
- **Governance ring pulse formula:** A reasonable starting formula is `animationDuration = 2000 - (governanceScore / 10) * 1500` ms, giving a range of ~500ms (score 10) to ~2000ms (score 1). Document the formula with a comment so it can be tuned.
- **Entrance animation approach:** Chart.js has a built-in animation system. The staggered scale+fade can be achieved via Chart.js animation config (`animation.delay` callback using dataset index) rather than manual DOM manipulation, which keeps the animation within Chart.js's render loop and avoids flicker.
- **Glow/size mode extrapolation:** The design spec calls out these modes but does not fully specify animation behavior. The implementation should make a documented decision in a code comment — e.g., "In size mode, ring is hidden; pulse logic remains but opacity is 0" — so future developers know this was intentional, not forgotten.
- **Ripple on overlay:** Use `requestAnimationFrame` for the ripple loop. Keep the active ripple list as a simple array; splice completed ripples out each frame. Cap concurrent ripples at a reasonable number (e.g., 5) to avoid accumulation during fast mouse movement.
- **Quadrant glow:** Draw a radial or linear gradient fill on the overlay canvas, clipped to the appropriate quadrant rectangle. Use low opacity (e.g., 0.06–0.12) to keep it subtle.

---

## Out of Scope

- Sound effects (covered in ISSUE-03)
- Detail panel or filter UI (covered in ISSUE-04)
- Mode switch UI controls (covered in ISSUE-04)
- Mobile-specific layout (covered in ISSUE-05)
- PNG export (covered in ISSUE-05)

---

## Definition of Done

Loading the chart in a browser shows a smooth staggered entrance of all 13 bubbles. Hovering over any bubble produces a ripple on the overlay canvas and a quadrant background glow. Governance rings visibly pulse at different speeds for high vs. low governance score bubbles. Resizing the browser window keeps the overlay canvas perfectly aligned. No console errors when any bubble's data fields are missing or unusual.
