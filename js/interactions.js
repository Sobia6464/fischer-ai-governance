/* interactions.js — Tooltip, zoom detail, comprehensive editor, filters, keyboard nav, export, HUD toggle */

var chartInstance = null;
var currentMode = 'ring';
var filterState = {
  governanceMin: 1,
  fischerActiveOnly: false,
  typeFilter: 'all',
  quadrantFilter: 'all',
  complexityFilter: 'all',
};
let focusedIndex = -1;
let panelOpen = false;
let panelOpenedThisClick = false;
let animStateRef = null;
let lastHoveredDatasetIndex = -1;
let hudVisible = true;
let openPanelTimer = null;
var wasDragging = false; // shared with drag handler

function getFilterState() { return filterState; }
function getCurrentMode() { return currentMode; }

function initInteractions(chart, animState) {
  chartInstance = chart;
  animStateRef = animState;
  setupTooltip();
  setupDetailPanel();
  setupFilters();
  setupModeButtons();
  setupKeyboardNav();
  setupExport();
  setupOverlayToggle();
  setupEditor();
  setupDragNodes();
  setupFilterPanel();
  setupSunView();
  // Dismiss hint on first click anywhere or after 10s
  const dismissHint = () => {
    const h = document.getElementById('hint-overlay');
    if (h) h.classList.add('dismissed');
  };
  document.addEventListener('click', dismissHint, { once: true });
  setTimeout(dismissHint, 10000);
}

/* ─── HUD Overlay Toggle ─── */
var hudAutoHideTimer = null; // kept as no-op var so quadrant-zoom.js refs don't throw
var hudManuallyShown = true; // always true — HUD never auto-hides

function setupOverlayToggle() {
  const overlay = document.getElementById('hud-overlay');
  const toggleBtn = document.getElementById('overlay-toggle');
  const showIcon = toggleBtn.querySelector('.toggle-icon-show');
  const hideIcon = toggleBtn.querySelector('.toggle-icon-hide');

  // HUD starts visible — set correct icon state
  showIcon.style.display = 'none'; hideIcon.style.display = '';
  toggleBtn.classList.add('hud-visible');
  toggleBtn.title = 'Hide controls';

  toggleBtn.addEventListener('click', () => {
    if (hudVisible) {
      overlay.classList.add('hidden');
      toggleBtn.classList.remove('hud-visible');
      showIcon.style.display = ''; hideIcon.style.display = 'none';
      toggleBtn.title = 'Show controls';
      hudVisible = false;
      toggleBtn.classList.remove('pulse');
      void toggleBtn.offsetWidth;
      toggleBtn.classList.add('pulse');
    } else {
      overlay.classList.remove('hidden');
      toggleBtn.classList.add('hud-visible');
      showIcon.style.display = 'none'; hideIcon.style.display = '';
      toggleBtn.title = 'Hide controls';
      hudVisible = true;
    }
  });
}

/* ─── Tooltip ─── */
function setupTooltip() {
  const canvas = chartInstance.canvas;
  const tt = document.getElementById('tooltip');
  canvas.addEventListener('mousemove', (evt) => {
    const els = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
    // Cursor: pointer for dots or sun center
    if (els.length) {
      canvas.style.cursor = 'pointer';
    } else {
      const area = chartInstance.chartArea;
      if (area) {
        const mx = chartInstance.scales.x.getPixelForValue(50);
        const my = chartInstance.scales.y.getPixelForValue(50);
        const rect = canvas.getBoundingClientRect();
        const d = Math.sqrt((evt.clientX - rect.left - mx) ** 2 + (evt.clientY - rect.top - my) ** 2);
        canvas.style.cursor = (d < 30 && !sunViewActive) ? 'pointer' : 'default';
      } else {
        canvas.style.cursor = 'default';
      }
    }
    if (!els.length) { tt.classList.remove('visible'); setQuadrantGlow(null); lastHoveredDatasetIndex = -1; return; }
    const dsi = els[0].datasetIndex;
    const ds = chartInstance.data.datasets[dsi];
    const p = ds._meta;
    if (!ds._visible) { tt.classList.remove('visible'); setQuadrantGlow(null); lastHoveredDatasetIndex = -1; return; }
    const isNew = dsi !== lastHoveredDatasetIndex;
    lastHoveredDatasetIndex = dsi;
    const quad = getQuadrant(p);
    setQuadrantGlow(quad, ds.borderColor);
    if (isNew) playHoverTone(quad);

    document.getElementById('tt-name').textContent = p.label;
    const ts = p.type==='tool' ? (p.active ? 'Tool / Agent \u2014 Fischer Active' : 'Tool / Agent') : 'Model / Infra';
    const te = document.getElementById('tt-type'); te.textContent = ts;
    te.style.color = p.active ? '#60a5fa' : p.type==='tool' ? '#00e8a2' : '#7b8ab8';
    document.getElementById('tt-x').textContent = p.x > 50 ? 'Agent' : 'Assistant';
    document.getElementById('tt-y').textContent = p.y > 50 ? 'High code' : 'Low / no code';
    const gc = govColor(p.gov);
    document.getElementById('tt-gov-fill').style.width = (p.gov*10)+'%';
    document.getElementById('tt-gov-fill').style.background = gc;
    const se = document.getElementById('tt-gov-score'); se.textContent = govLabel(p.gov)+' ('+p.gov+'/10)'; se.style.color = gc;
    const ge = document.getElementById('tt-gaps');
    ge.innerHTML = p.gaps && p.gaps.length
      ? p.gaps.map(g => `<div class="tt-gap-item"><span class="tt-gap-icon">\u2715</span>${g}</div>`).join('')
      : `<div class="tt-gap-item" style="color:#00e8a2"><span style="color:#00e8a2">\u2713</span> Strong IT governance coverage</div>`;

    const x=evt.clientX, y=evt.clientY, ww=window.innerWidth, wh=window.innerHeight;
    let tx=x+14, ty=y+14;
    if(tx+280>ww-10) tx=x-294; if(ty+220>wh-10) ty=y-234;
    tt.style.left=tx+'px'; tt.style.top=ty+'px'; tt.classList.add('visible');
  });
  canvas.addEventListener('mouseleave', () => { tt.classList.remove('visible'); setQuadrantGlow(null); });
}

/* ─── Detail Panel with Camera Zoom ─── */
function setupDetailPanel() {
  const canvas = chartInstance.canvas;
  const panel = document.getElementById('detail-panel');
  const backdrop = document.getElementById('detail-backdrop');
  const closeBtn = document.getElementById('detail-close');
  const chartArea = document.getElementById('chartArea');

  canvas.addEventListener('click', (evt) => {
    if (zoomState.active && zoomState.direction >= 0) return;
    if (wasDragging) return;
    // In dots edit mode, clicking opens editor instead of zoom
    if (editorDotsActive) {
      const els2 = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
      if (els2.length) {
        const ds2 = chartInstance.data.datasets[els2[0].datasetIndex];
        if (ds2._visible) showDotEditor(ds2._index);
      }
      return;
    }
    const els = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
    if (!els.length) return;
    const dsi = els[0].datasetIndex;
    const ds = chartInstance.data.datasets[dsi];
    if (!ds._visible) return;

    const meta = chartInstance.getDatasetMeta(dsi);
    const pt = meta.data[0];
    const cr = canvas.getBoundingClientRect();
    const sx = cr.left + pt.x, sy = cr.top + pt.y;
    const p = ds._meta;

    // Fade out chart, show only stars + planet
    startZoomIn(sx, sy, ds.borderColor, p.gov, p.active, p.type, p.label);
    playZoomWoosh();
    chartArea.classList.add('zoomed');
    document.getElementById('tooltip').classList.remove('visible');

    if (openPanelTimer) clearTimeout(openPanelTimer);
    openPanelTimer = setTimeout(() => { openPanelTimer = null; openDetailPanel(p); }, 400);
    panelOpenedThisClick = true;
    setTimeout(() => { panelOpenedThisClick = false; }, 500);
  });

  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeDetailPanel(); });
  backdrop.addEventListener('click', (e) => { e.stopPropagation(); closeDetailPanel(); });
  document.addEventListener('click', (e) => {
    if (panelOpenedThisClick || !panelOpen) return;
    if (panel.contains(e.target) || e.target.closest('.chart-universe') || e.target.closest('.overlay-toggle')) return;
    closeDetailPanel();
  });
}

function openDetailPanel(p) {
  document.getElementById('detail-view-mode').style.display = '';
  document.getElementById('detail-name').textContent = p.label;
  const te = document.getElementById('detail-type');
  te.textContent = p.type==='tool' ? 'Tool / Agent' : 'Model / Infra';
  te.style.color = p.type==='tool' ? '#00e8a2' : '#7b8ab8';
  const ab = document.getElementById('detail-active');
  ab.textContent = p.active ? 'Fischer Active' : 'Not Active';
  ab.className = 'detail-active-badge ' + (p.active ? 'is-active' : 'not-active');
  document.getElementById('detail-deployment').textContent = p.x > 50 ? 'Agent' : 'Assistant';
  document.getElementById('detail-complexity').textContent = p.y > 50 ? 'High Code' : 'Low Code';
  const gc = govColor(p.gov);
  document.getElementById('detail-gov-fill').style.width = (p.gov*10)+'%';
  document.getElementById('detail-gov-fill').style.background = gc;
  const se = document.getElementById('detail-gov-score'); se.textContent = govLabel(p.gov)+' ('+p.gov+'/10)'; se.style.color = gc;
  const gl = document.getElementById('detail-gaps-list');
  gl.innerHTML = p.gaps && p.gaps.length
    ? p.gaps.map(g => `<div class="detail-gap-item"><span class="detail-gap-icon">\u2715</span><span>${g}</span></div>`).join('')
    : `<div class="detail-no-gaps"><span>\u2713</span> Strong IT governance coverage</div>`;
  // URL — only show if non-empty
  const urlSection = document.getElementById('detail-url-section');
  if (urlSection) {
    const urlVal = (p.url || '').trim();
    if (urlVal) {
      urlSection.style.display = '';
      const link = document.getElementById('detail-url-link');
      link.href = urlVal;
      link.textContent = urlVal;
    } else {
      urlSection.style.display = 'none';
    }
  }
  // Additional notes — only show if non-empty
  const notesEl = document.getElementById('detail-notes-section');
  if (notesEl) {
    if (p.notes && p.notes.trim()) {
      notesEl.style.display = '';
      document.getElementById('detail-notes-text').textContent = p.notes;
    } else {
      notesEl.style.display = 'none';
    }
  }
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('detail-backdrop').classList.add('visible');
  panelOpen = true;
}

function closeDetailPanel() {
  if (openPanelTimer) { clearTimeout(openPanelTimer); openPanelTimer = null; }
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-backdrop').classList.remove('visible');
  const chartArea = document.getElementById('chartArea');
  chartArea.classList.remove('zoomed');
  startZoomOut();
  panelOpen = false;
}

/* ─── Comprehensive Editor ─── */
var editorDotsActive = false; // is Tools & Agents tab active (shows grid)

function setupEditor() {
  const editorBtn = document.getElementById('edit-mode-btn');
  const editorPanel = document.getElementById('editor-panel');
  const tabs = editorPanel.querySelectorAll('.editor-tab');
  const tabLabels = document.getElementById('tab-labels');
  const tabDots = document.getElementById('tab-dots');
  const chartArea = document.getElementById('chartArea');

  // Toggle editor panel
  editorBtn.addEventListener('click', () => {
    const open = editorPanel.style.display !== 'none';
    editorPanel.style.display = open ? 'none' : '';
    editorBtn.classList.toggle('active', !open);
    if (open) {
      editorDotsActive = false;
      chartArea.classList.remove('show-grid');
    } else {
      // Close filter panel when opening editor
      document.getElementById('filter-panel').style.display = 'none';
      document.getElementById('filter-open-btn').classList.remove('active');
    }
  });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isDots = tab.dataset.tab === 'dots';
      tabLabels.style.display = isDots ? 'none' : '';
      tabDots.style.display = isDots ? '' : 'none';
      editorDotsActive = isDots;
      chartArea.classList.toggle('show-grid', isDots);
      if (isDots) showDotsDirectMode();
    });
  });

  // Apply text changes
  document.getElementById('ed-labels-save').addEventListener('click', () => {
    document.querySelector('.hud-title h1').textContent = document.getElementById('ed-title').value;
    document.querySelector('.hud-title-accent').textContent = document.getElementById('ed-subtitle').value;
    document.querySelector('.hud-title-pre').textContent = document.getElementById('ed-pretitle').value;
    const qls = document.querySelectorAll('.ql');
    qls.forEach(ql => {
      const icon = ql.querySelector('.ql-icon').outerHTML;
      if (ql.classList.contains('tl')) ql.innerHTML = icon + ' ' + document.getElementById('ed-ql-tl').value;
      if (ql.classList.contains('tr')) ql.innerHTML = icon + ' ' + document.getElementById('ed-ql-tr').value;
      if (ql.classList.contains('bl')) ql.innerHTML = icon + ' ' + document.getElementById('ed-ql-bl').value;
      if (ql.classList.contains('br')) ql.innerHTML = icon + ' ' + document.getElementById('ed-ql-br').value;
    });
    // Active badge is auto-managed by updateActiveBadge() — no manual override
  });
}

// Tools & Agents direct manipulation mode — minimal panel, click dots to edit
function showDotsDirectMode() {
  const list = document.getElementById('dot-list');
  list.innerHTML = `
    <div class="dots-direct-mode">
      <div class="dots-direct-hint">Click any dot to edit it. Drag to reposition.</div>
      <button class="edit-save-btn" id="ed-add-new-btn" style="width:100%;margin-top:8px">+ Add New Tool / Agent</button>
    </div>`;
  document.getElementById('ed-add-new-btn').addEventListener('click', () => showDotEditor(-1));
}


function showDotEditor(idx) {
  const isNew = idx < 0;
  const p = isNew ? { label: '', x: 50, y: 50, gov: 5, type: 'tool', active: false, gaps: [], notes: '' } : COMPANIES[idx];
  const list = document.getElementById('dot-list');

  // Replace list with inline editor
  list.innerHTML = `
    <div class="dot-inline-editor">
      <div class="edit-section-title">${isNew ? 'Add New' : 'Edit'} Tool / Agent</div>
      <div class="edit-field">
        <label class="edit-label">Name</label>
        <input type="text" class="edit-input" id="de-name" value="${p.label}">
      </div>
      <div class="edit-field">
        <label class="edit-label">Type</label>
        <select class="edit-input" id="de-type">
          <option value="tool" ${p.type==='tool'?'selected':''}>Tool / Agent</option>
          <option value="model" ${p.type==='model'?'selected':''}>Model / Infra</option>
        </select>
      </div>
      <div class="edit-row">
        <div class="edit-field">
          <label class="edit-label">Agent Axis (X)</label>
          <input type="range" class="edit-slider" id="de-x" min="0" max="100" value="${p.x}">
          <span class="edit-slider-val" id="de-x-val">${p.x}</span>
        </div>
        <div class="edit-field">
          <label class="edit-label">Code Axis (Y)</label>
          <input type="range" class="edit-slider" id="de-y" min="0" max="100" value="${p.y}">
          <span class="edit-slider-val" id="de-y-val">${p.y}</span>
        </div>
      </div>
      <div class="edit-field">
        <label class="edit-label">Governance Score</label>
        <input type="range" class="edit-slider" id="de-gov" min="1" max="10" value="${p.gov}">
        <span class="edit-slider-val" id="de-gov-val">${p.gov}</span>
      </div>
      <div class="edit-field">
        <label class="edit-label"><input type="checkbox" id="de-active" ${p.active?'checked':''}> Fischer Active</label>
      </div>
      <div class="edit-field">
        <label class="edit-label">Governance Gaps (one per line)</label>
        <textarea class="edit-textarea" id="de-gaps" rows="3">${(p.gaps||[]).join('\n')}</textarea>
      </div>
      <div class="edit-field">
        <label class="edit-label">Website / Resource URL</label>
        <input type="url" class="edit-input" id="de-url" placeholder="https://..." value="${p.url||''}">
      </div>
      <div class="edit-field">
        <label class="edit-label">Additional Notes</label>
        <textarea class="edit-textarea" id="de-notes" rows="2" placeholder="Optional notes about this tool...">${p.notes||''}</textarea>
      </div>
      <div class="edit-actions">
        <button class="edit-save-btn" id="de-save">${isNew ? 'Add to Map' : 'Save Changes'}</button>
        ${!isNew ? '<button class="edit-cancel-btn delete" id="de-delete" style="flex:0;padding:10px 14px;color:var(--accent2);border-color:var(--accent)">Delete</button>' : ''}
        <button class="edit-cancel-btn" id="de-cancel">Cancel</button>
      </div>
    </div>`;

  // Wire sliders
  document.getElementById('de-x').addEventListener('input', e => document.getElementById('de-x-val').textContent = e.target.value);
  document.getElementById('de-y').addEventListener('input', e => document.getElementById('de-y-val').textContent = e.target.value);
  document.getElementById('de-gov').addEventListener('input', e => document.getElementById('de-gov-val').textContent = e.target.value);

  document.getElementById('de-cancel').addEventListener('click', showDotsDirectMode);
  document.getElementById('de-save').addEventListener('click', () => {
    const name = document.getElementById('de-name').value.trim();
    if (!name) { document.getElementById('de-name').focus(); return; }
    const gapsText = document.getElementById('de-gaps').value.trim();
    const data = {
      label: name,
      x: parseInt(document.getElementById('de-x').value),
      y: parseInt(document.getElementById('de-y').value),
      gov: parseInt(document.getElementById('de-gov').value),
      type: document.getElementById('de-type').value,
      active: document.getElementById('de-active').checked,
      gaps: gapsText ? gapsText.split('\n').map(s=>s.trim()).filter(Boolean) : [],
      url:   (document.getElementById('de-url').value   || '').trim(),
      notes: (document.getElementById('de-notes').value || '').trim(),
    };
    if (isNew) { COMPANIES.push(data); }
    else { Object.assign(COMPANIES[idx], data); }
    saveData();
    rebuildChart();
    showDotsDirectMode();
  });
  // Delete button
  const delBtn = document.getElementById('de-delete');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      COMPANIES.splice(idx, 1);
      saveData();
      rebuildChart();
      showDotsDirectMode();
    });
  }
}

function rebuildChart() {
  chartInstance.data.datasets = buildDatasets(currentMode, filterState);
  chartInstance.update('none');
  // Rebuild keyboard nav
  const container = document.getElementById('keyboard-nav');
  if (container) {
    container.innerHTML = '';
    navButtons.length = 0;
    COMPANIES.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = 'sr-only';
      btn.setAttribute('aria-label', `${p.label}, governance ${p.gov} out of 10, ${p.type}`);
      btn.dataset.index = i;
      btn.addEventListener('focus', () => { focusedIndex = i; highlightFocusedDot(i); });
      btn.addEventListener('blur', () => setFocusRing(null));
      btn.addEventListener('keydown', (e) => {
        if (e.key==='Enter'||e.key===' ') { e.preventDefault(); openDetailPanel(COMPANIES[i]); }
        else if (e.key==='Escape') closeDetailPanel();
        else if (e.key==='ArrowRight'||e.key==='ArrowDown') { e.preventDefault(); focusNext(1); }
        else if (e.key==='ArrowLeft'||e.key==='ArrowUp') { e.preventDefault(); focusNext(-1); }
      });
      container.appendChild(btn);
      navButtons.push(btn);
    });
  }
}

/* ─── Drag Nodes to Reposition ─── */
function setupDragNodes() {
  const canvas = chartInstance.canvas;
  let dragIdx = -1;
  let isDragging = false;

  canvas.addEventListener('mousedown', (evt) => {
    // Only allow dragging when editor is open
    if (document.getElementById('editor-panel').style.display === 'none') return;
    if (zoomState.active) return;
    const els = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
    if (!els.length) return;
    const dsi = els[0].datasetIndex;
    const ds = chartInstance.data.datasets[dsi];
    if (!ds._visible) return;
    dragIdx = ds._index;
    isDragging = false; // will become true on mousemove
    evt.preventDefault();
  });

  canvas.addEventListener('mousemove', (evt) => {
    if (dragIdx < 0) return;
    isDragging = true;
    canvas.style.cursor = 'grabbing';
    // Convert pixel position to chart data coordinates
    const rect = canvas.getBoundingClientRect();
    const xPixel = evt.clientX - rect.left;
    const yPixel = evt.clientY - rect.top;
    const xVal = chartInstance.scales.x.getValueForPixel(xPixel);
    const yVal = chartInstance.scales.y.getValueForPixel(yPixel);
    // Clamp to 0-100
    COMPANIES[dragIdx].x = Math.max(0, Math.min(100, Math.round(xVal)));
    COMPANIES[dragIdx].y = Math.max(0, Math.min(100, Math.round(yVal)));
    // Update chart live
    chartInstance.data.datasets[dragIdx].data[0] = { x: COMPANIES[dragIdx].x, y: COMPANIES[dragIdx].y };
    chartInstance.update('none');
  });

  function endDrag() {
    if (dragIdx >= 0 && isDragging) {
      saveData();
      chartInstance.data.datasets = buildDatasets(currentMode, filterState);
      chartInstance.update('none');
      wasDragging = true;
      setTimeout(() => { wasDragging = false; }, 50);
    }
    dragIdx = -1;
    isDragging = false;
    canvas.style.cursor = '';
  }

  canvas.addEventListener('mouseup', endDrag);
  canvas.addEventListener('mouseleave', endDrag);
}

/* ─── Filters ─── */
function setupFilters() {
  const slider = document.getElementById('gov-slider');
  const sv = document.getElementById('slider-value');
  const at = document.getElementById('active-toggle');
  const typeF = document.getElementById('filter-type');
  const quadF = document.getElementById('filter-quadrant');
  const compF = document.getElementById('filter-complexity');
  const resetBtn = document.getElementById('filter-reset');

  slider.addEventListener('input', () => { filterState.governanceMin = parseInt(slider.value); sv.textContent = slider.value; applyFilters(); });
  at.addEventListener('change', () => { filterState.fischerActiveOnly = at.checked; applyFilters(); });
  typeF.addEventListener('change', () => { filterState.typeFilter = typeF.value; applyFilters(); });
  quadF.addEventListener('change', () => { filterState.quadrantFilter = quadF.value; applyFilters(); });
  compF.addEventListener('change', () => { filterState.complexityFilter = compF.value; applyFilters(); });

  resetBtn.addEventListener('click', () => {
    filterState.governanceMin = 1;
    filterState.fischerActiveOnly = false;
    filterState.typeFilter = 'all'; filterState.quadrantFilter = 'all'; filterState.complexityFilter = 'all';
    slider.value = 1; sv.textContent = '1'; at.checked = false;
    typeF.value = 'all'; quadF.value = 'all'; compF.value = 'all';
    applyFilters();
  });
}

/* ─── Filter Panel Toggle ─── */
function setupFilterPanel() {
  const btn = document.getElementById('filter-open-btn');
  const panel = document.getElementById('filter-panel');

  function closeFilterPanel() {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }

  btn.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    if (open) { closeFilterPanel(); return; }
    panel.style.display = '';
    btn.classList.add('active');
    // Close editor if opening filters
    document.getElementById('editor-panel').style.display = 'none';
    document.getElementById('edit-mode-btn').classList.remove('active');
    editorDotsActive = false;
    document.getElementById('chartArea').classList.remove('show-grid');
  });

  // Filter panel closes via the Filters button toggle (no outside-click dismiss)
}

/* ─── Sun View — click sun to zoom in, show active nodes ─── */
function setupSunView() {
  const canvas = chartInstance.canvas;
  const sunPanel = document.getElementById('sun-panel');
  const sunClose = document.getElementById('sun-close');
  const chartArea = document.getElementById('chartArea');

  // Click handler for sun
  canvas.addEventListener('click', (evt) => {
    if (editorDotsActive || zoomState.active || sunViewActive) return;
    const hitEls = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
    if (hitEls.length) return;
    const area = chartInstance.chartArea;
    if (!area) return;
    const mx = chartInstance.scales.x.getPixelForValue(50);
    const my = chartInstance.scales.y.getPixelForValue(50);
    const rect = canvas.getBoundingClientRect();
    const dist = Math.sqrt((evt.clientX - rect.left - mx) ** 2 + (evt.clientY - rect.top - my) ** 2);
    if (dist < 30) {
      openSunView();
    }
  });

  sunClose.addEventListener('click', (e) => { e.stopPropagation(); closeSunView(); });

  // Click blank space to exit sun view — use the detail backdrop
  document.getElementById('detail-backdrop').addEventListener('click', (e) => {
    if (sunViewActive) { e.stopPropagation(); closeSunView(); }
  });

  function openSunView() {
    startSunView();
    startSunSound();
    chartArea.classList.add('zoomed');
    // Build active nodes list
    const list = document.getElementById('sun-node-list');
    const activeNodes = COMPANIES.filter(p => p.active);
    list.innerHTML = activeNodes.length ? activeNodes.map((p, i) => {
      const realIdx = COMPANIES.indexOf(p);
      return `<div class="sun-node-item" data-idx="${realIdx}">
        <div class="sun-node-dot"></div>
        <div><div class="sun-node-name">${p.label}</div>
        <div class="sun-node-meta">Gov ${p.gov}/10 &middot; ${p.x > 50 ? 'Agent' : 'Assistant'}</div></div>
        <div class="sun-node-arrow">&rsaquo;</div>
      </div>`;
    }).join('') : '<div class="sun-node-meta" style="text-align:center;padding:20px">No Fischer Active tools</div>';

    // Wire up clicks to navigate to those nodes
    list.querySelectorAll('.sun-node-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        // Crossfade: sun fades while planet starts — no blank gap
        stopSunView();
        stopSunSound();
        document.getElementById('sun-panel').style.display = 'none';
        // Short delay — start planet as sun fades for crossfade
        setTimeout(() => {
          const ds = chartInstance.data.datasets[idx];
          if (!ds) return;
          const meta = chartInstance.getDatasetMeta(idx);
          const pt = meta.data[0];
          if (!pt) return;
          const cr = canvas.getBoundingClientRect();
          const p = ds._meta;
          startZoomIn(cr.left + pt.x, cr.top + pt.y, ds.borderColor, p.gov, p.active, p.type, p.label);
          playZoomWoosh();
          chartArea.classList.add('zoomed');
          document.getElementById('tooltip').classList.remove('visible');
          if (openPanelTimer) clearTimeout(openPanelTimer);
          openPanelTimer = setTimeout(() => { openPanelTimer = null; openDetailPanel(p); }, 400);
          panelOpenedThisClick = true;
          setTimeout(() => { panelOpenedThisClick = false; }, 500);
        }, 600);
      });
    });

    sunPanel.style.display = '';
    document.getElementById('detail-backdrop').classList.add('visible');
  }
}

function closeSunView() {
  stopSunView();
  stopSunSound();
  document.getElementById('chartArea').classList.remove('zoomed');
  document.getElementById('sun-panel').style.display = 'none';
  document.getElementById('detail-backdrop').classList.remove('visible');
}
function applyFilters() {
  chartInstance.data.datasets = buildDatasets(currentMode, filterState);
  chartInstance.update('none');
  updateKeyboardFocusability();
  const vc = chartInstance.data.datasets.filter(ds => ds._visible).length;
  const ann = document.getElementById('filter-announce');
  if (ann) ann.textContent = `Showing ${vc} of ${COMPANIES.length} items`;
  const emptyEl = document.getElementById('empty-state');
  if (emptyEl) emptyEl.style.display = vc === 0 ? '' : 'none';
}

/* ─── Mode buttons ─── */
function setupModeButtons() {
  document.querySelectorAll('.gov-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gov-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if (animStateRef) animStateRef.currentMode = currentMode;
      playModeChime(currentMode);
      applyFilters();
    });
  });
}

/* ─── Keyboard navigation ─── */
const navButtons = [];
function setupKeyboardNav() {
  const container = document.getElementById('keyboard-nav');
  if (!container) return;
  COMPANIES.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'sr-only';
    btn.setAttribute('aria-label', `${p.label}, governance ${p.gov} out of 10, ${p.type}`);
    btn.dataset.index = i;
    btn.addEventListener('focus', () => { focusedIndex = i; highlightFocusedDot(i); });
    btn.addEventListener('blur', () => setFocusRing(null));
    btn.addEventListener('keydown', (e) => {
      if (e.key==='Enter'||e.key===' ') { e.preventDefault(); openDetailPanel(COMPANIES[i]); }
      else if (e.key==='Escape') closeDetailPanel();
      else if (e.key==='ArrowRight'||e.key==='ArrowDown') { e.preventDefault(); focusNext(1); }
      else if (e.key==='ArrowLeft'||e.key==='ArrowUp') { e.preventDefault(); focusNext(-1); }
    });
    container.appendChild(btn); navButtons.push(btn);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key==='Escape' && panelOpen) { closeDetailPanel(); if (focusedIndex>=0&&navButtons[focusedIndex]) navButtons[focusedIndex].focus(); }
  });
}
function highlightFocusedDot(i) {
  const meta=chartInstance.getDatasetMeta(i); const pt=meta.data[0]; if(!pt)return;
  const cr=chartInstance.canvas.getBoundingClientRect(); setFocusRing(cr.left+pt.x, cr.top+pt.y, '#ff4d6a');
}
function focusNext(dir) {
  const vi=[]; for(let i=0;i<COMPANIES.length;i++) if(navButtons[i]&&navButtons[i].tabIndex!==-1) vi.push(i);
  if(!vi.length)return; const cp=vi.indexOf(focusedIndex);
  const next=cp===-1?vi[0]:vi[(cp+dir+vi.length)%vi.length]; navButtons[next].focus();
}
function updateKeyboardFocusability() {
  COMPANIES.forEach((p,i) => {
    if (!navButtons[i]) return;
    navButtons[i].tabIndex = isItemVisible(p, filterState) ? 0 : -1;
  });
}

/* ─── PNG Export ─── */
function setupExport() {
  const btn = document.getElementById('export-btn'); if(!btn)return;
  btn.addEventListener('click', async () => {
    await document.fonts.ready;
    const cc=chartInstance.canvas, dpr=window.devicePixelRatio||1, tw=1600, th=120;
    const cw=cc.width/dpr, ch=cc.height/dpr, sc=tw/cw, totalH=th+ch*sc;
    const oc=document.createElement('canvas'); oc.width=tw*dpr; oc.height=totalH*dpr;
    const ctx=oc.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.fillStyle='#030510'; ctx.fillRect(0,0,tw,totalH);
    ctx.fillStyle='#f0f4ff'; ctx.font='800 32px Syne,sans-serif'; ctx.fillText('AI at Fischer Group',40,50);
    ctx.fillStyle='#ff4d6a'; ctx.fillText('The Reality',40,88);
    ctx.fillStyle='rgba(160,175,220,0.7)'; ctx.font='400 12px "DM Mono",monospace';
    ctx.fillText('Governance scored on IT control \u00B7 standardization \u00B7 observability',40,110);
    ctx.drawImage(cc,0,th,cw*sc,ch*sc);
    const link=document.createElement('a'); link.download=`fischer-ai-governance-${new Date().toISOString().slice(0,10)}.png`;
    link.href=oc.toDataURL('image/png'); link.click();
  });
}
