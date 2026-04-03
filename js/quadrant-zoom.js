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

  // ── Hook into the quadrant filter dropdown ───────────────────────────────
  // The DOM is already loaded (this script runs after </body>), so query directly
  const quadF = document.getElementById('filter-quadrant');
  if (quadF) {
    quadF.addEventListener('change', () => zoomToQuadrant(quadF.value));
  }

  // Also wire the reset button so it zooms back out
  const resetBtn = document.getElementById('filter-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => zoomToQuadrant('all'));
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
    // Prevent HUD auto-hide while PIN modal is open — same effect as manual toggle
    if (typeof hudAutoHideTimer !== 'undefined' && hudAutoHideTimer) {
      clearTimeout(hudAutoHideTimer);
      hudAutoHideTimer = null;
    }
    if (typeof hudManuallyShown !== 'undefined') hudManuallyShown = true;

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

  // ── Firebase sync — source of truth for all edits ────────────────────────
  // localStorage is used only as an instant-render cache on first paint.
  // Firebase is always the canonical state — survives cache clears, domain
  // changes, and different browsers/devices.
  const FB = 'https://fischer-ai-governance-default-rtdb.firebaseio.com/state/';
  const LS_DATA_KEY   = 'fischer-gov-data-expanded';
  const LS_LABELS_KEY = 'fischer-gov-labels-expanded';

  // ── Helpers: read editor inputs ──────────────────────────────────────────
  function readEditorValues() {
    return {
      title:    document.getElementById('ed-title')?.value    || '',
      subtitle: document.getElementById('ed-subtitle')?.value || '',
      pretitle: document.getElementById('ed-pretitle')?.value || '',
      qlTl:     document.getElementById('ed-ql-tl')?.value    || '',
      qlTr:     document.getElementById('ed-ql-tr')?.value    || '',
      qlBl:     document.getElementById('ed-ql-bl')?.value    || '',
      qlBr:     document.getElementById('ed-ql-br')?.value    || '',
    };
  }

  function applyLabelsToDOM(d) {
    const h1     = document.querySelector('.hud-title h1');
    const accent = document.querySelector('.hud-title-accent');
    const pre    = document.querySelector('.hud-title-pre');
    if (h1     && d.title)    h1.textContent     = d.title;
    if (accent && d.subtitle) accent.textContent = d.subtitle;
    if (pre    && d.pretitle) pre.textContent    = d.pretitle;
    document.querySelectorAll('.ql').forEach(ql => {
      const icon = ql.querySelector('.ql-icon')?.outerHTML || '';
      if (ql.classList.contains('tl') && d.qlTl) ql.innerHTML = icon + ' ' + d.qlTl;
      if (ql.classList.contains('tr') && d.qlTr) ql.innerHTML = icon + ' ' + d.qlTr;
      if (ql.classList.contains('bl') && d.qlBl) ql.innerHTML = icon + ' ' + d.qlBl;
      if (ql.classList.contains('br') && d.qlBr) ql.innerHTML = icon + ' ' + d.qlBr;
    });
  }

  function applyLabelsToEditor(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
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
  };

  // ── Labels save button — write to Firebase + localStorage ────────────────
  const saveLabelsBtn = document.getElementById('ed-labels-save');
  if (saveLabelsBtn) {
    saveLabelsBtn.addEventListener('click', () => {
      const d = readEditorValues();
      try { localStorage.setItem(LS_LABELS_KEY, JSON.stringify(d)); } catch(e) {}
      fbPut('labels', d);
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
