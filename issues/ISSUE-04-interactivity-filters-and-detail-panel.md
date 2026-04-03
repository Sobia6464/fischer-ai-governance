# ISSUE-04: Interactivity, Filters, and Detail Panel

## Summary

Implement the full user interaction layer: a click-triggered detail panel, a governance threshold slider, a "Fischer Active Only" toggle, governance view mode switching, and complete keyboard navigation. Filters must compose correctly, and the keyboard navigation must work on a canvas-based chart without native focus management.

---

## Background

The existing chart has a basic Chart.js tooltip but no deeper interactivity. This issue transforms it into a genuinely useful data exploration tool. A user should be able to click a bubble, read meaningful company detail, filter by governance threshold or Fischer relationship status, and navigate entirely by keyboard.

The primary challenge is that Chart.js renders to a `<canvas>` — there are no DOM elements representing individual bubbles, so standard tab focus and ARIA patterns don't apply. Keyboard navigation requires a hidden DOM layer of focusable elements mirroring the chart data.

All interaction logic lives in `js/interactions.js`. This module is the heaviest in the project.

---

## Acceptance Criteria

**Detail Panel**
- [ ] Clicking a bubble opens a detail panel fixed to the right side of the viewport (360px wide on desktop, full-width on mobile below 768px)
- [ ] The panel displays: company name, quadrant label, governance score (numeric), innovation score (numeric), market cap indicator, and **active Fischer relationship status** (explicitly shown as "Active" or "Not Active" — not omitted)
- [ ] The panel has a close button (and closes on Escape key)
- [ ] The panel opens and closes with a smooth slide transition (200–300ms ease)
- [ ] Clicking outside the panel (on the chart or background) closes the panel
- [ ] If no bubble is selected, the panel is not visible and does not occupy layout space

**Governance Threshold Slider**
- [ ] A range input (`<input type="range">`) allows filtering from 1–10
- [ ] Bubbles with a governance score **below** the slider value fade out (reduce opacity) or are hidden; they do not disappear abruptly
- [ ] The slider's current value is displayed numerically next to the control
- [ ] At value 1 (minimum), all bubbles are visible (no filtering)

**Fischer Active Only Toggle**
- [ ] A toggle (checkbox or styled switch) labeled "Fischer Active Only" hides/shows bubbles based on whether the company has an active Fischer relationship
- [ ] When toggled on, only Fischer-active companies are displayed; all others fade out

**Filter Composition**
- [ ] The governance slider and Fischer Active filter apply simultaneously — a bubble must satisfy both conditions to be shown
- [ ] Filter precedence is documented in a code comment: governance threshold is evaluated first, then Fischer active status is applied as an additional constraint
- [ ] Filtered-out bubbles are visually consistent: same reduced opacity whether filtered by threshold, by Fischer toggle, or by both

**Governance View Modes**
- [ ] Three mode buttons (or a segmented control) allow switching between: Ring, Glow, Size
- [ ] The active mode is visually indicated (e.g., highlighted button state)
- [ ] Switching modes triggers the mode chime (see ISSUE-03) and re-renders the chart with the appropriate visual treatment
- [ ] Mode state is reflected in chart rendering via Chart.js dataset or plugin configuration updates

**Keyboard Navigation**
- [ ] Pressing Tab moves focus to the chart interaction area
- [ ] Arrow keys (left/right or up/down) cycle through the 13 data points in a consistent order (e.g., by company name alphabetically, or by governance score descending — document the chosen order)
- [ ] Enter/Space on a focused bubble opens the detail panel for that company
- [ ] Escape closes the detail panel and returns focus to the previously focused bubble
- [ ] A visually distinct focus ring or highlight is rendered on the currently keyboard-focused bubble (on the overlay canvas or via Chart.js highlight)
- [ ] The hidden DOM focusable layer (one `<button>` per company, visually hidden via `clip` or `sr-only` pattern, not `display:none`) is kept in sync with the filter state — filtered-out bubbles are also removed from the tab order (`tabindex="-1"` or `disabled`)

---

## Technical Notes

- **Hidden DOM layer for keyboard nav:** Create one `<button>` per company data point, styled with the standard screen-reader-only pattern:
  ```css
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }
  ```
  Each button has `aria-label="[Company Name], governance [score], innovation [score]"`. When the button receives focus, draw the focus highlight on the overlay canvas using the company's chart coordinates. On blur, clear the highlight.

- **Chart.js coordinate lookup:** Use `chart.getDatasetMeta(0).data[index].x` and `.y` to get the pixel coordinates of each bubble for drawing the focus ring and ripple on the overlay canvas.

- **Filter state object:** Maintain a single filter state object:
  ```js
  const filterState = { governanceMin: 1, fischerActiveOnly: false };
  ```
  Write a single `applyFilters()` function that reads this object and updates Chart.js dataset point styles/opacity. Call it from both the slider handler and the toggle handler to avoid divergence.

- **Detail panel active status:** The data for each company should include an `active` boolean or equivalent field. If this field is absent in the existing data, default to `false` and add a code comment flagging it for data review. The panel must always render this field — never silently omit it.

- **Smooth filter transitions:** Use Chart.js's `update('active')` or set `animation.duration` to 200ms before calling `chart.update()` when filter state changes, so bubbles fade in/out rather than snapping.

- **Mode switching:** Store the current mode in a module-level variable in `interactions.js`. Mode changes should call a `setGovernanceMode(mode)` function that updates Chart.js plugin config or dataset point styling and calls `chart.update()`.

- **Click outside to close panel:** Add a single `click` listener on `document`. If the click target is not inside the detail panel and not a chart bubble, close the panel. Use a flag to prevent the same click event that opened the panel from immediately closing it.

---

## Out of Scope

- Audio implementation (covered in ISSUE-03)
- Visual animations (covered in ISSUE-02)
- PNG export (covered in ISSUE-05)
- Mobile layout adjustments (covered in ISSUE-05)
- Persisting filter state across page reloads

---

## Definition of Done

Clicking any bubble opens the detail panel with complete company information including explicit active status. The governance slider and Fischer Active toggle filter bubbles smoothly and compose correctly when both are active. All three view mode buttons work and trigger the correct visual treatment. A keyboard-only user can navigate to any bubble, open its detail panel, and close it without touching a mouse. No console errors occur when filters result in zero visible bubbles.
