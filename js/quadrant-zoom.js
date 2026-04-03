/* quadrant-zoom.js — Quadrant zoom for index-expanded.html ONLY.
   Animates Chart.js scale bounds when the quadrant filter dropdown changes.
   The Fischer Group sun lives at data coords (50,50), so it naturally appears
   at whichever corner of the zoomed view is closest to the chart center.
   Does not modify index.html, chart-setup.js, or interactions.js. */

(function () {

  // Data-space bounds for each quadrant + the full view
  const QUAD_BOUNDS = {
    tl:  { xMin: 0,   xMax: 50,  yMin: 50,  yMax: 100 }, // top-left  → sun at bottom-right corner
    tr:  { xMin: 50,  xMax: 100, yMin: 50,  yMax: 100 }, // top-right → sun at bottom-left corner
    bl:  { xMin: 0,   xMax: 50,  yMin: 0,   yMax: 50  }, // bot-left  → sun at top-right corner
    br:  { xMin: 50,  xMax: 100, yMin: 0,   yMax: 50  }, // bot-right → sun at top-left corner
    all: { xMin: 0,   xMax: 100, yMin: 0,   yMax: 100 },
  };

  let zoomFrom = { ...QUAD_BOUNDS.all };
  let zoomTo   = { ...QUAD_BOUNDS.all };
  let zoomProgress = 1; // 1 = animation complete
  let zoomRafId = null;

  // Expose current zoom quad so chart-setup-expanded.js quadPlugin can read it
  window._expandedZoomQuad = 'all';

  // ── Easing ───────────────────────────────────────────────────────────────
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function lerp(a, b, t) { return a + (b - a) * easeInOut(t); }

  // ── Apply scale bounds to the chart ──────────────────────────────────────
  function applyBounds(b) {
    if (typeof chartInstance === 'undefined' || !chartInstance) return;
    chartInstance.options.scales.x.min = b.xMin;
    chartInstance.options.scales.x.max = b.xMax;
    chartInstance.options.scales.y.min = b.yMin;
    chartInstance.options.scales.y.max = b.yMax;
    chartInstance.update('none');
  }

  // ── Animation tick ────────────────────────────────────────────────────────
  function tick() {
    zoomProgress += 0.028; // ~36 frames @ 60fps ≈ 0.6 s transition
    if (zoomProgress >= 1) {
      zoomProgress = 1;
      applyBounds(zoomTo);
      zoomRafId = null;
      return;
    }
    applyBounds({
      xMin: lerp(zoomFrom.xMin, zoomTo.xMin, zoomProgress),
      xMax: lerp(zoomFrom.xMax, zoomTo.xMax, zoomProgress),
      yMin: lerp(zoomFrom.yMin, zoomTo.yMin, zoomProgress),
      yMax: lerp(zoomFrom.yMax, zoomTo.yMax, zoomProgress),
    });
    zoomRafId = requestAnimationFrame(tick);
  }

  // ── Public: zoom to a named quadrant ─────────────────────────────────────
  function zoomToQuadrant(quad) {
    window._expandedZoomQuad = quad;

    const target = QUAD_BOUNDS[quad] || QUAD_BOUNDS.all;

    // Capture current scale state as the starting point
    if (typeof chartInstance !== 'undefined' && chartInstance) {
      zoomFrom = {
        xMin: chartInstance.options.scales.x.min,
        xMax: chartInstance.options.scales.x.max,
        yMin: chartInstance.options.scales.y.min,
        yMax: chartInstance.options.scales.y.max,
      };
    } else {
      zoomFrom = { ...QUAD_BOUNDS.all };
    }

    zoomTo = { ...target };
    zoomProgress = 0;
    if (zoomRafId) cancelAnimationFrame(zoomRafId);
    zoomRafId = requestAnimationFrame(tick);

    // Fade non-active quadrant labels and axis labels in DOM
    updateQuadrantLabelVisibility(quad);
  }

  // ── Dim DOM quadrant + axis labels when zoomed ───────────────────────────
  function updateQuadrantLabelVisibility(quad) {
    // Quadrant corner labels (.ql)
    document.querySelectorAll('.ql').forEach(el => {
      if (quad === 'all') {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '';
      } else {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = el.classList.contains(quad) ? '1' : '0.1';
      }
    });

    // Axis labels — hide the axes that point "out" of the zoomed quadrant
    const axTop    = document.querySelector('.axis-y-top');
    const axBottom = document.querySelector('.axis-y-bottom');
    const axLeft   = document.querySelector('.axis-x-left');
    const axRight  = document.querySelector('.axis-x-right');

    const transition = 'opacity 0.5s';
    [axTop, axBottom, axLeft, axRight].forEach(el => {
      if (!el) return;
      el.style.transition = transition;
    });

    if (quad === 'all') {
      [axTop, axBottom, axLeft, axRight].forEach(el => { if (el) el.style.opacity = ''; });
    } else {
      // Show only the axis labels that bound the selected quadrant
      const showTop    = quad === 'tl' || quad === 'tr'; // top quadrants = high code
      const showBottom = quad === 'bl' || quad === 'br'; // bottom = low code
      const showLeft   = quad === 'tl' || quad === 'bl'; // left = assistant
      const showRight  = quad === 'tr' || quad === 'br'; // right = agent
      if (axTop)    axTop.style.opacity    = showTop    ? '1' : '0.12';
      if (axBottom) axBottom.style.opacity = showBottom ? '1' : '0.12';
      if (axLeft)   axLeft.style.opacity   = showLeft   ? '1' : '0.12';
      if (axRight)  axRight.style.opacity  = showRight  ? '1' : '0.12';
    }
  }

  // ── Scroll-wheel Zoom + Drag Pan ─────────────────────────────────────────
  // Works on top of the quadrant zoom — reads live chart bounds each time.
  const SZ_MIN_RANGE  = 15;   // tightest zoom: 15-unit window ≈ 6.7× at center
  const SZ_DATA_LO    = 0;
  const SZ_DATA_HI    = 100;
  const SZ_ZOOM_STEP  = 0.12; // 12% range change per wheel notch

  function szGetBounds() {
    return {
      xMin: chartInstance.options.scales.x.min,
      xMax: chartInstance.options.scales.x.max,
      yMin: chartInstance.options.scales.y.min,
      yMax: chartInstance.options.scales.y.max,
    };
  }

  function szClamp(b) {
    let { xMin, xMax, yMin, yMax } = b;
    // Enforce minimum range (max zoom-in)
    if (xMax - xMin < SZ_MIN_RANGE) { const cx = (xMin+xMax)/2; xMin = cx-SZ_MIN_RANGE/2; xMax = cx+SZ_MIN_RANGE/2; }
    if (yMax - yMin < SZ_MIN_RANGE) { const cy = (yMin+yMax)/2; yMin = cy-SZ_MIN_RANGE/2; yMax = cy+SZ_MIN_RANGE/2; }
    // Enforce maximum range (full view)
    if (xMax - xMin > SZ_DATA_HI - SZ_DATA_LO) { xMin = SZ_DATA_LO; xMax = SZ_DATA_HI; }
    if (yMax - yMin > SZ_DATA_HI - SZ_DATA_LO) { yMin = SZ_DATA_LO; yMax = SZ_DATA_HI; }
    // Slide range to stay inside data bounds (don't squash)
    if (xMin < SZ_DATA_LO) { xMax += SZ_DATA_LO - xMin; xMin = SZ_DATA_LO; }
    if (xMax > SZ_DATA_HI) { xMin -= xMax - SZ_DATA_HI; xMax = SZ_DATA_HI; }
    if (yMin < SZ_DATA_LO) { yMax += SZ_DATA_LO - yMin; yMin = SZ_DATA_LO; }
    if (yMax > SZ_DATA_HI) { yMin -= yMax - SZ_DATA_HI; yMax = SZ_DATA_HI; }
    return { xMin, xMax, yMin, yMax };
  }

  function szIsFullOut() {
    if (!chartInstance) return true;
    const b = szGetBounds();
    return (b.xMax - b.xMin) >= (SZ_DATA_HI - SZ_DATA_LO - 0.5);
  }

  const szCanvas = document.getElementById('chart');

  // ── Wheel: zoom toward cursor ─────────────────────────────────────────────
  szCanvas.addEventListener('wheel', (e) => {
    if (!chartInstance) return;
    e.preventDefault();
    const b    = szGetBounds();
    const ca   = chartInstance.chartArea;
    const rect = szCanvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    if (px < ca.left || px > ca.right || py < ca.top || py > ca.bottom) return;

    // Fractional position → data coords (Chart.js Y is inverted)
    const fx = (px - ca.left) / (ca.right  - ca.left);
    const fy = (py - ca.top)  / (ca.bottom - ca.top);
    const dX = b.xMin + fx * (b.xMax - b.xMin);
    const dY = b.yMax - fy * (b.yMax - b.yMin);

    // >1 = zoom out (scroll down), <1 = zoom in (scroll up)
    const ratio = e.deltaY > 0 ? (1 + SZ_ZOOM_STEP) : (1 - SZ_ZOOM_STEP);

    // Cancel any in-progress quadrant animation so it doesn't fight the scroll
    if (zoomRafId) { cancelAnimationFrame(zoomRafId); zoomRafId = null; }

    applyBounds(szClamp({
      xMin: dX - (dX - b.xMin) * ratio,
      xMax: dX + (b.xMax - dX) * ratio,
      yMin: dY - (dY - b.yMin) * ratio,
      yMax: dY + (b.yMax - dY) * ratio,
    }));
  }, { passive: false });

  // ── Drag pan ─────────────────────────────────────────────────────────────
  let szPanActive = false;
  let szPanStart  = null;   // { x, y } client pixels at drag start
  let szPanBounds = null;   // chart bounds at drag start
  let szPanMoved  = false;  // true once movement exceeds dead zone

  szCanvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !chartInstance || szIsFullOut()) return;
    const ca   = chartInstance.chartArea;
    const rect = szCanvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    if (px < ca.left || px > ca.right || py < ca.top || py > ca.bottom) return;
    szPanActive = true;
    szPanMoved  = false;
    szPanStart  = { x: e.clientX, y: e.clientY };
    szPanBounds = szGetBounds();
  }, true); // capture phase — registers before interactions.js sees it

  window.addEventListener('mousemove', (e) => {
    if (!szPanActive || !chartInstance) return;
    const dx = e.clientX - szPanStart.x;
    const dy = e.clientY - szPanStart.y;
    if (!szPanMoved && Math.hypot(dx, dy) < 5) return; // 5-px dead zone
    szPanMoved = true;
    const ca = chartInstance.chartArea;
    const b  = szPanBounds;
    const w  = ca.right  - ca.left;
    const h  = ca.bottom - ca.top;
    const xShift = -dx / w * (b.xMax - b.xMin);
    const yShift =  dy / h * (b.yMax - b.yMin); // dy positive = dragged down = data goes up
    applyBounds(szClamp({
      xMin: b.xMin + xShift, xMax: b.xMax + xShift,
      yMin: b.yMin + yShift, yMax: b.yMax + yShift,
    }));
    szCanvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    if (!szPanActive) return;
    if (szPanMoved) {
      // Swallow the click that follows a drag so dot tooltips don't fire
      szCanvas.addEventListener('click', ev => ev.stopPropagation(), { once: true, capture: true });
    }
    szPanActive = false;
    szPanMoved  = false;
    szPanStart  = null;
    szPanBounds = null;
    if (szCanvas.style.cursor === 'grabbing') szCanvas.style.cursor = '';
  });

  // Grab-cursor hint when zoomed in (runs after interactions.js so we can
  // check whether it already set 'pointer' for a hovered dot)
  szCanvas.addEventListener('mousemove', (e) => {
    if (szPanActive || szIsFullOut() || !chartInstance) return;
    const ca   = chartInstance.chartArea;
    const rect = szCanvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    if (px >= ca.left && px <= ca.right && py >= ca.top && py <= ca.bottom) {
      if (szCanvas.style.cursor !== 'pointer' && szCanvas.style.cursor !== 'grabbing') {
        szCanvas.style.cursor = 'grab';
      }
    } else if (szCanvas.style.cursor === 'grab') {
      szCanvas.style.cursor = '';
    }
  });

  // ── Search ────────────────────────────────────────────────────────────────
  // Injects searchTerm into the global filterState so it composes with all
  // existing filters without touching interactions.js.

  // Seed the property so isItemVisible() can always read it safely
  if (typeof filterState !== 'undefined') filterState.searchTerm = '';

  // Black hole animation styles — build particle keyframes dynamically
  const BH_PARTICLE_COUNT = 16;
  const BH_COLORS = ['rgba(255,160,60,0.9)','rgba(100,190,255,0.9)','rgba(220,140,255,0.9)','rgba(255,220,120,0.85)'];
  let particleKF = '';
  for (let i = 0; i < BH_PARTICLE_COUNT; i++) {
    const a0 = Math.round((i / BH_PARTICLE_COUNT) * 360);
    const r0 = 95 + (i % 4) * 14; // 95, 109, 123, 137
    particleKF += `
    @keyframes bhSpiral${i} {
      0%   { transform:rotate(${a0}deg) translateX(${r0}px) scale(1);   opacity:0.85; }
      55%  { opacity:0.55; }
      88%  { transform:rotate(${a0 + 540}deg) translateX(12px) scale(0.35); opacity:0.2; }
      100% { transform:rotate(${a0 + 720}deg) translateX(0)   scale(0);    opacity:0; }
    }`;
  }

  const bhStyles = document.createElement('style');
  bhStyles.textContent = `
    /* Scene container gives 3-D perspective context */
    #bh-scene { perspective: 700px; }

    /* Outer nebula glow — pulsing halo behind everything */
    #bh-outer-glow {
      position:absolute; width:280px; height:280px;
      border-radius:50%; top:0; left:0;
      background:radial-gradient(circle,
        rgba(60,0,100,0)   30%,
        rgba(60,0,120,0.22) 52%,
        rgba(20,0,60,0.35)  68%,
        rgba(0,0,20,0)      100%);
      animation:bhOuterPulse 4s ease-in-out infinite;
    }

    /* Accretion disk 1 — hot orange/gold, fast */
    #bh-disk1 {
      position:absolute; width:246px; height:62px;
      border-radius:50%; top:50%; left:50%;
      transform:translate(-50%,-50%) rotateX(68deg) rotateZ(0deg);
      box-shadow:0 0 0 1.5px rgba(255,140,20,0.55),
                 0 0 14px 5px rgba(255,100,0,0.28),
                 inset 0 0 0 1px rgba(255,190,80,0.18);
      animation:bhDisk1 5.5s linear infinite;
    }

    /* Accretion disk 2 — electric blue, counter-spin */
    #bh-disk2 {
      position:absolute; width:214px; height:52px;
      border-radius:50%; top:50%; left:50%;
      transform:translate(-50%,-50%) rotateX(75deg) rotateZ(30deg);
      box-shadow:0 0 0 1px rgba(80,170,255,0.45),
                 0 0 12px 4px rgba(60,140,255,0.22);
      animation:bhDisk2 9s linear infinite reverse;
    }

    /* Accretion disk 3 — deep purple, slow outer ring */
    #bh-disk3 {
      position:absolute; width:272px; height:58px;
      border-radius:50%; top:50%; left:50%;
      transform:translate(-50%,-50%) rotateX(64deg) rotateZ(-22deg);
      box-shadow:0 0 0 1px rgba(190,80,255,0.3),
                 0 0 16px 6px rgba(150,40,255,0.14);
      animation:bhDisk3 15s linear infinite;
    }

    /* The black hole itself */
    #bh-orb {
      position:absolute; width:160px; height:160px;
      border-radius:50%; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:radial-gradient(circle at 38% 35%, #040410 32%, #000 100%);
      box-shadow:0 0 0 2px rgba(80,40,140,0.35),
                 0 0 45px 22px rgba(0,0,0,0.99),
                 0 0 90px 45px rgba(35,0,75,0.55),
                 0 0 150px 75px rgba(18,0,45,0.32);
      animation:bhPulse 3.5s ease-in-out infinite;
      z-index:10;
    }

    /* Photon sphere — bright flickering ring right at the event horizon */
    #bh-horizon {
      position:absolute; width:164px; height:164px;
      border-radius:50%; top:50%; left:50%;
      transform:translate(-50%,-50%);
      box-shadow:0 0 0 1.5px rgba(255,215,130,0.75),
                 0 0 10px 4px rgba(255,175,70,0.4),
                 inset 0 0 0 1px rgba(255,220,150,0.3);
      animation:bhHorizon 2.2s ease-in-out infinite;
      z-index:11;
    }

    /* Particle container anchored at BH center */
    #bh-particles {
      position:absolute; width:0; height:0;
      top:50%; left:50%; z-index:6;
    }
    .bh-particle {
      position:absolute; border-radius:50%;
      transform-origin:0 0;
      margin:-1px 0 0 -1px;
    }

    /* Label — always above the glow, solid backdrop */
    #bh-label {
      color:rgba(190,205,235,0.92);
      font:400 13px 'DM Mono',monospace;
      letter-spacing:.08em; text-align:center;
      background:rgba(2,2,14,0.85);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      border:1px solid rgba(100,120,220,0.18);
      border-radius:10px;
      padding:10px 22px;
      position:relative; z-index:20;
    }
    #bh-label span { font-size:10px; opacity:0.58; }

    /* Keyframes */
    @keyframes bhPulse {
      0%,100% { box-shadow:0 0 0 2px rgba(80,40,140,0.35),0 0 45px 22px rgba(0,0,0,0.99),0 0 90px 45px rgba(35,0,75,0.55),0 0 150px 75px rgba(18,0,45,0.32); }
      50%     { box-shadow:0 0 0 4px rgba(90,45,155,0.45),0 0 65px 32px rgba(0,0,0,1),   0 0 120px 60px rgba(55,0,110,0.65),0 0 200px 100px rgba(25,0,60,0.42); }
    }
    @keyframes bhHorizon {
      0%,100% { opacity:1; box-shadow:0 0 0 1.5px rgba(255,215,130,0.75),0 0 10px 4px rgba(255,175,70,0.4),inset 0 0 0 1px rgba(255,220,150,0.3); }
      35%     { opacity:0.65; box-shadow:0 0 0 1px rgba(255,215,130,0.5),0 0 6px 2px rgba(255,175,70,0.25),inset 0 0 0 1px rgba(255,220,150,0.15); }
      70%     { opacity:0.85; }
    }
    @keyframes bhOuterPulse {
      0%,100% { transform:scale(1);   opacity:0.8; }
      50%     { transform:scale(1.12); opacity:1; }
    }
    @keyframes bhDisk1 {
      from { transform:translate(-50%,-50%) rotateX(68deg) rotateZ(0deg); }
      to   { transform:translate(-50%,-50%) rotateX(68deg) rotateZ(360deg); }
    }
    @keyframes bhDisk2 {
      from { transform:translate(-50%,-50%) rotateX(75deg) rotateZ(30deg); }
      to   { transform:translate(-50%,-50%) rotateX(75deg) rotateZ(390deg); }
    }
    @keyframes bhDisk3 {
      from { transform:translate(-50%,-50%) rotateX(64deg) rotateZ(-22deg); }
      to   { transform:translate(-50%,-50%) rotateX(64deg) rotateZ(338deg); }
    }
    ${particleKF}
  `;
  document.head.appendChild(bhStyles);

  // Spawn spiraling particles into #bh-particles
  (function spawnParticles() {
    const container = document.getElementById('bh-particles');
    if (!container) return;
    for (let i = 0; i < BH_PARTICLE_COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'bh-particle';
      const sz   = 1.5 + (i % 3) * 0.9;          // 1.5 / 2.4 / 3.3 px
      const dur  = 2.6 + (i % 5) * 0.55;          // 2.6 – 4.8 s
      const del  = -((i / BH_PARTICLE_COUNT) * dur); // stagger so they're mid-flight on show
      const col  = BH_COLORS[i % BH_COLORS.length];
      p.style.cssText =
        `width:${sz}px;height:${sz}px;` +
        `background:${col};` +
        `box-shadow:0 0 ${sz * 2.5}px ${col};` +
        `animation:bhSpiral${i} ${dur}s linear ${del}s infinite;`;
      container.appendChild(p);
    }
  })();

  const searchNoResults = document.getElementById('search-no-results');

  function showBlackHole(show) {
    if (!searchNoResults) return;
    searchNoResults.style.display = show ? 'flex' : 'none';
  }

  function applySearch(term) {
    if (typeof filterState === 'undefined' || typeof applyFilters === 'undefined') return;
    filterState.searchTerm = term;
    applyFilters();

    const hint     = document.getElementById('search-hint');
    const clearBtn = document.getElementById('search-clear');
    const hasQuery = term.trim().length > 0;

    if (clearBtn) clearBtn.style.display = hasQuery ? '' : 'none';

    if (!hasQuery) {
      showBlackHole(false);
      if (hint) hint.textContent = '';
      return;
    }

    const visCount = typeof chartInstance !== 'undefined'
      ? chartInstance.data.datasets.filter(ds => ds._visible).length : 0;

    if (visCount === 0) {
      showBlackHole(true);
      if (hint) hint.textContent = '';
    } else {
      showBlackHole(false);
      if (hint) hint.textContent = `${visCount} match${visCount === 1 ? '' : 'es'}`;
    }
  }

  // Debounced input handler — feels instant but doesn't thrash on every keystroke
  let searchDebounce = null;
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => applySearch(searchInput.value), 150);
    });
  }

  // Clear button
  const searchClearBtn = document.getElementById('search-clear');
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      applySearch('');
      searchInput?.focus();
    });
  }

  // Search panel toggle — closes filter/editor panels when opened
  const searchOpenBtn = document.getElementById('search-open-btn');
  const searchPanel   = document.getElementById('search-panel');
  if (searchOpenBtn && searchPanel) {
    searchOpenBtn.addEventListener('click', () => {
      const open = searchPanel.style.display !== 'none';
      if (open) {
        searchPanel.style.display = 'none';
        searchOpenBtn.classList.remove('active');
        // Clear search when closing panel
        if (searchInput) searchInput.value = '';
        applySearch('');
      } else {
        searchPanel.style.display = '';
        searchOpenBtn.classList.add('active');
        // Close other panels
        document.getElementById('filter-panel').style.display = 'none';
        document.getElementById('filter-open-btn').classList.remove('active');
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('edit-mode-btn').classList.remove('active');
        requestAnimationFrame(() => searchInput?.focus());
      }
    });
  }

  // ── Hook into the quadrant filter dropdown ───────────────────────────────
  // The DOM is already loaded (this script runs after </body>), so query directly
  const quadF = document.getElementById('filter-quadrant');
  if (quadF) {
    quadF.addEventListener('change', () => zoomToQuadrant(quadF.value));
  }

  // Also wire the reset button so it zooms back out and clears the count toggle
  const resetBtn = document.getElementById('filter-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      zoomToQuadrant('all');
      const countCb = document.getElementById('ed-show-count');
      if (countCb) { countCb.checked = false; updateSubtitleDisplay(); }
    });
  }

  // ── Admin PIN gate ────────────────────────────────────────────────────────
  // Change ADMIN_PIN to whatever you want. This is client-side only — it stops
  // accidental edits by stakeholders, not a determined attacker reading source.
  const ADMIN_PIN     = 'Fischer1980';
  const SESSION_KEY   = 'fischer-admin-unlocked';

  // Inject PIN modal styles once
  const pinStyles = document.createElement('style');
  pinStyles.textContent = `
    .pin-backdrop {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(3,5,16,0.85); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
    }
    .pin-modal {
      background: rgba(12,16,40,0.97);
      border: 1px solid rgba(100,160,255,0.25);
      border-radius: 12px; padding: 32px 28px;
      width: 300px; box-shadow: 0 0 40px rgba(0,232,162,0.08);
      display: flex; flex-direction: column; gap: 16px;
    }
    .pin-title { color: #d7e1f8; font: 700 15px 'Syne',sans-serif; letter-spacing: .04em; }
    .pin-sub   { color: rgba(160,175,220,0.6); font: 400 11px 'DM Mono',monospace; }
    .pin-input {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(100,160,255,0.2);
      border-radius: 6px; color: #d7e1f8; font: 500 18px 'DM Mono',monospace;
      padding: 10px 14px; width: 100%; box-sizing: border-box;
      letter-spacing: .2em; text-align: center; outline: none;
      transition: border-color .2s;
    }
    .pin-input:focus { border-color: rgba(0,232,162,0.5); }
    .pin-input.shake {
      animation: pinShake .35s ease;
      border-color: rgba(255,77,106,0.7);
    }
    @keyframes pinShake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-6px)}
      80%{transform:translateX(6px)}
    }
    .pin-error  { color: #ff4d6a; font: 400 11px 'DM Mono',monospace; min-height: 14px; }
    .pin-btn {
      background: rgba(0,232,162,0.12); border: 1px solid rgba(0,232,162,0.35);
      border-radius: 6px; color: #00e8a2; cursor: pointer;
      font: 600 13px 'Syne',sans-serif; padding: 10px;
      transition: background .2s;
    }
    .pin-btn:hover { background: rgba(0,232,162,0.22); }
    .pin-cancel {
      background: none; border: none; color: rgba(160,175,220,0.4);
      cursor: pointer; font: 400 11px 'DM Mono',monospace; text-align: center;
    }
    .pin-cancel:hover { color: rgba(160,175,220,0.7); }
  `;
  document.head.appendChild(pinStyles);

  function showPinModal() {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'pin-backdrop';
      backdrop.innerHTML = `
        <div class="pin-modal" role="dialog" aria-modal="true" aria-label="Admin access required">
          <div class="pin-title">&#9670; Admin Access</div>
          <div class="pin-sub">Enter the admin PIN to enable editing.</div>
          <input class="pin-input" type="password" inputmode="numeric"
                 maxlength="20" placeholder="&#9679;&#9679;&#9679;&#9679;" autocomplete="off">
          <div class="pin-error" id="pin-error-msg"></div>
          <button class="pin-btn">Unlock Editing</button>
          <button class="pin-cancel">Cancel</button>
        </div>`;
      document.body.appendChild(backdrop);

      const input  = backdrop.querySelector('.pin-input');
      const errMsg = backdrop.querySelector('#pin-error-msg');
      const okBtn  = backdrop.querySelector('.pin-btn');
      const cancel = backdrop.querySelector('.pin-cancel');

      // Focus input immediately
      requestAnimationFrame(() => input.focus());

      function attempt() {
        if (input.value === ADMIN_PIN) {
          backdrop.remove();
          resolve(true);
        } else {
          errMsg.textContent = 'Incorrect PIN. Try again.';
          input.classList.remove('shake');
          void input.offsetWidth; // reflow to restart animation
          input.classList.add('shake');
          input.value = '';
          requestAnimationFrame(() => input.focus());
        }
      }

      okBtn.addEventListener('click', attempt);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
      cancel.addEventListener('click', () => { backdrop.remove(); resolve(false); });
      backdrop.addEventListener('click', e => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } });
    });
  }

  // Intercept Edit button in capture phase — fires before interactions.js bubble listener
  const editBtn = document.getElementById('edit-mode-btn');
  if (editBtn) {
    editBtn.addEventListener('click', async (e) => {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return; // already unlocked this session
      e.stopImmediatePropagation(); // block interactions.js from seeing this click
      const granted = await showPinModal();
      if (granted) {
        sessionStorage.setItem(SESSION_KEY, '1');
        editBtn.click(); // re-fire now that session is unlocked — passes through cleanly
      }
    }, true /* capture phase */);
  }

  // ── Export PNG — reflects current zoom, filters, and label edits ─────────
  // Replaces interactions.js export (capture phase blocks the original handler).
  // Composites: starfield → chart → overlay → header bar, exactly as seen.
  async function doExport() {
    await document.fonts.ready;

    const chartCanvas   = document.getElementById('chart');
    const starCanvas    = document.getElementById('starfield');
    const overlayCanvas = document.getElementById('overlay-canvas');
    if (!chartCanvas) return;

    const dpr    = window.devicePixelRatio || 1;
    const tw     = 1600;                        // target export width (px)
    const thdr   = 120;                         // header bar height
    const cw     = chartCanvas.width  / dpr;
    const ch     = chartCanvas.height / dpr;
    const sc     = tw / cw;
    const totalH = thdr + ch * sc;

    const oc  = document.createElement('canvas');
    oc.width  = tw   * dpr;
    oc.height = totalH * dpr;
    const ctx = oc.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── Background ──
    ctx.fillStyle = '#030510';
    ctx.fillRect(0, 0, tw, totalH);

    // ── Starfield ──
    if (starCanvas) ctx.drawImage(starCanvas, 0, thdr, cw * sc, ch * sc);

    // ── Chart (includes current zoom, filtered dots, gov rings) ──
    ctx.drawImage(chartCanvas, 0, thdr, cw * sc, ch * sc);

    // ── Overlay canvas (ripple/hover effects) ──
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, thdr, cw * sc, ch * sc);

    // ── Header bar — reads live DOM values so edits and labels are reflected ──
    const title    = document.querySelector('.hud-title h1')?.textContent      || 'AI at Fischer Group';
    const subtitle = document.querySelector('.hud-title-accent')?.textContent  || '';
    const pretitle = document.querySelector('.hud-title-pre')?.textContent     || '';
    const dateStr  = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    // Subtle header tint
    ctx.fillStyle = 'rgba(3,5,22,0.7)';
    ctx.fillRect(0, 0, tw, thdr);

    // Pre-title tag
    ctx.fillStyle = 'rgba(160,175,220,0.5)';
    ctx.font = '400 11px "DM Mono",monospace';
    ctx.textAlign = 'left';
    ctx.fillText(pretitle, 40, 28);

    // Main title
    ctx.fillStyle = '#f0f4ff';
    ctx.font = '800 32px Syne,sans-serif';
    ctx.fillText(title, 40, 62);

    // Subtitle (accent colour, immediately after title)
    const titleWidth = ctx.measureText(title + '  ').width;
    ctx.fillStyle = '#ff4d6a';
    ctx.font = '700 32px Syne,sans-serif';
    ctx.fillText(subtitle, 40 + titleWidth, 62);

    // Footnote
    ctx.fillStyle = 'rgba(160,175,220,0.45)';
    ctx.font = '400 11px "DM Mono",monospace';
    ctx.fillText('Governance scored on IT control \u00B7 standardization \u00B7 observability', 40, 96);

    // Date stamp — right-aligned
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, tw - 40, 96);
    ctx.textAlign = 'left';

    // ── Footer — active filter summary ───────────────────────────────────────
    const tfooter = 48;
    // Extend canvas height to fit footer
    const oc2  = document.createElement('canvas');
    oc2.width  = oc.width;
    oc2.height = oc.height + tfooter * dpr;
    const ctx2 = oc2.getContext('2d');
    ctx2.scale(dpr, dpr);
    ctx2.drawImage(oc, 0, 0, tw, totalH); // copy existing content

    // Build filter label list from live DOM
    const filters = [];
    const govVal  = parseInt(document.getElementById('gov-slider')?.value || '1');
    const activeOnly  = document.getElementById('active-toggle')?.checked;
    const typeVal     = document.getElementById('filter-type')?.value     || 'all';
    const quadVal     = document.getElementById('filter-quadrant')?.value || 'all';
    const complexVal  = document.getElementById('filter-complexity')?.value || 'all';

    const quadLabels = { tl:'Technical Assistants', tr:'Custom-Built Agents',
                         bl:'Simple Chat Assistants', br:'No-Code Agentic Tools' };
    const typeLabels = { tool:'Tools / Agents', model:'Models / Infra' };
    const complexLabels = { high:'High Code', low:'Low Code' };

    if (govVal > 1)           filters.push(`Gov \u2265 ${govVal}`);
    if (activeOnly)           filters.push('Fischer Active Only');
    if (typeVal !== 'all')    filters.push(`Type: ${typeLabels[typeVal] || typeVal}`);
    if (quadVal !== 'all')    filters.push(`Quadrant: ${quadLabels[quadVal] || quadVal}`);
    if (complexVal !== 'all') filters.push(`Complexity: ${complexLabels[complexVal] || complexVal}`);

    const filterText = filters.length
      ? 'Filters applied: ' + filters.join('  \u00B7  ')
      : 'Filters: All tools shown';

    // Footer bar
    ctx2.fillStyle = 'rgba(3,5,22,0.85)';
    ctx2.fillRect(0, totalH, tw, tfooter);

    // Separator line
    ctx2.strokeStyle = 'rgba(100,160,255,0.15)';
    ctx2.lineWidth = 1;
    ctx2.beginPath(); ctx2.moveTo(0, totalH); ctx2.lineTo(tw, totalH); ctx2.stroke();

    // Filter text
    ctx2.fillStyle = filters.length ? 'rgba(255,176,32,0.85)' : 'rgba(160,175,220,0.45)';
    ctx2.font = `400 12px "DM Mono",monospace`;
    ctx2.textAlign = 'left';
    ctx2.fillText(filterText, 40, totalH + 29);

    // Visible count
    const visCount = typeof chartInstance !== 'undefined'
      ? chartInstance.data.datasets.filter(ds => ds._visible).length : null;
    if (visCount !== null) {
      ctx2.fillStyle = 'rgba(160,175,220,0.35)';
      ctx2.textAlign = 'right';
      ctx2.fillText(`${visCount} of ${COMPANIES.length} tools`, tw - 40, totalH + 29);
    }

    // ── Download ──
    const link = document.createElement('a');
    link.download = `fischer-ai-governance-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = oc2.toDataURL('image/png');
    link.click();
  }

  // Intercept the export button before interactions.js sees the click
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      await doExport();
    }, true /* capture phase */);
  }

  // ── Firebase sync — source of truth for all edits ────────────────────────
  // localStorage is used only as an instant-render cache on first paint.
  // Firebase is always the canonical state — survives cache clears, domain
  // changes, and different browsers/devices.
  const FB = 'https://fischer-ai-governance-default-rtdb.firebaseio.com/state/';
  const LS_DATA_KEY   = 'fischer-gov-data-expanded';
  const LS_LABELS_KEY = 'fischer-gov-labels-expanded';

  // ── Tool count toggle ─────────────────────────────────────────────────────
  // Keeps the subtitle base text separate from the live count suffix.
  // Auto-refreshes whenever COMPANIES changes (add/delete/save).
  function updateSubtitleDisplay() {
    const accent = document.querySelector('.hud-title-accent');
    if (!accent) return;
    const base      = document.getElementById('ed-subtitle')?.value || accent.textContent.replace(/\s*\(\d+\s+tools?\)$/i, '').trim();
    const showCount = document.getElementById('ed-show-count')?.checked;
    accent.textContent = showCount ? `${base} (${COMPANIES.length} tools)` : base;
  }

  document.getElementById('ed-show-count')?.addEventListener('change', updateSubtitleDisplay);

  // ── Helpers: read editor inputs ──────────────────────────────────────────
  function readEditorValues() {
    return {
      title:     document.getElementById('ed-title')?.value    || '',
      subtitle:  document.getElementById('ed-subtitle')?.value || '',
      pretitle:  document.getElementById('ed-pretitle')?.value || '',
      qlTl:      document.getElementById('ed-ql-tl')?.value    || '',
      qlTr:      document.getElementById('ed-ql-tr')?.value    || '',
      qlBl:      document.getElementById('ed-ql-bl')?.value    || '',
      qlBr:      document.getElementById('ed-ql-br')?.value    || '',
      showCount: document.getElementById('ed-show-count')?.checked || false,
    };
  }

  function applyLabelsToDOM(d) {
    const h1     = document.querySelector('.hud-title h1');
    const accent = document.querySelector('.hud-title-accent');
    const pre    = document.querySelector('.hud-title-pre');
    if (h1  && d.title)    h1.textContent  = d.title;
    if (pre && d.pretitle) pre.textContent = d.pretitle;
    // Subtitle handled via updateSubtitleDisplay so the count stays live
    const subEl = document.getElementById('ed-subtitle');
    if (subEl && d.subtitle) subEl.value = d.subtitle;
    if (accent && d.subtitle) accent.textContent = d.subtitle; // set base first
    document.querySelectorAll('.ql').forEach(ql => {
      const icon = ql.querySelector('.ql-icon')?.outerHTML || '';
      if (ql.classList.contains('tl') && d.qlTl) ql.innerHTML = icon + ' ' + d.qlTl;
      if (ql.classList.contains('tr') && d.qlTr) ql.innerHTML = icon + ' ' + d.qlTr;
      if (ql.classList.contains('bl') && d.qlBl) ql.innerHTML = icon + ' ' + d.qlBl;
      if (ql.classList.contains('br') && d.qlBr) ql.innerHTML = icon + ' ' + d.qlBr;
    });
    // Apply count toggle if saved
    const countEl = document.getElementById('ed-show-count');
    if (countEl && d.showCount !== undefined) {
      countEl.checked = d.showCount;
      updateSubtitleDisplay();
    }
  }

  function applyLabelsToEditor(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    set('ed-title',    d.title);
    set('ed-subtitle', d.subtitle);
    set('ed-pretitle', d.pretitle);
    set('ed-ql-tl',    d.qlTl);
    set('ed-ql-tr',    d.qlTr);
    set('ed-ql-bl',    d.qlBl);
    set('ed-ql-br',    d.qlBr);
  }

  // ── Firebase write helpers ───────────────────────────────────────────────
  function fbPut(path, data) {
    return fetch(FB + path + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {}); // silent fail — localStorage still has the data as backup
  }

  // ── Override saveData (companies) to also write to Firebase ──────────────
  // saveData is defined in chart-setup-expanded.js; we wrap it here since
  // quadrant-zoom.js loads last and has access to the global.
  const _origSaveData = window.saveData;
  window.saveData = function () {
    _origSaveData.call(this);                    // writes to localStorage + toast
    fbPut('companies', COMPANIES);               // also write to Firebase
    updateSubtitleDisplay();                     // refresh count if shown
  };

  // ── Labels save button — write to Firebase + localStorage ────────────────
  const saveLabelsBtn = document.getElementById('ed-labels-save');
  if (saveLabelsBtn) {
    saveLabelsBtn.addEventListener('click', () => {
      const d = readEditorValues();
      try { localStorage.setItem(LS_LABELS_KEY, JSON.stringify(d)); } catch(e) {}
      fbPut('labels', d);
      updateSubtitleDisplay(); // re-apply count after text changes
    });
  }

  // ── On page load: instant render from localStorage, then sync from Firebase ──
  // Step 1 — instant render (localStorage cache, zero network delay)
  (function renderFromCache() {
    try {
      const companies = JSON.parse(localStorage.getItem(LS_DATA_KEY));
      if (companies && Array.isArray(companies)) {
        COMPANIES.length = 0;
        companies.forEach(c => COMPANIES.push(c));
      }
    } catch(e) {}
    try {
      const labels = JSON.parse(localStorage.getItem(LS_LABELS_KEY));
      if (labels) { applyLabelsToDOM(labels); applyLabelsToEditor(labels); }
    } catch(e) {}
  })();

  // Step 2 — authoritative sync from Firebase (overwrites cache if different)
  (async function syncFromFirebase() {
    try {
      const res = await fetch(FB + '../state.json'); // fetch whole state node
      if (!res.ok) return;
      const state = await res.json();
      if (!state) return;

      // Update companies
      if (state.companies && Array.isArray(state.companies)) {
        COMPANIES.length = 0;
        state.companies.forEach(c => COMPANIES.push(c));
        // Rebuild chart with Firebase data
        if (typeof rebuildChart === 'function') {
          rebuildChart();
        } else if (typeof chartInstance !== 'undefined' && chartInstance) {
          chartInstance.data.datasets = buildDatasets(getCurrentMode(), getFilterState());
          chartInstance.update('none');
        }
        updateActiveBadge();
        try { localStorage.setItem(LS_DATA_KEY, JSON.stringify(COMPANIES)); } catch(e) {}
      }

      // Update labels
      if (state.labels) {
        applyLabelsToDOM(state.labels);
        applyLabelsToEditor(state.labels);
        try { localStorage.setItem(LS_LABELS_KEY, JSON.stringify(state.labels)); } catch(e) {}
      }
    } catch(e) {
      // Firebase unreachable — localStorage cache already rendered, nothing lost
    }
  })();

})();
