/* main.js — PERFORMANCE-OPTIMIZED entry point */

initStarfield();
initPlanet();
updateActiveBadge(); // sync badge with loaded data

const animState = { time: 0, currentMode: 'ring' };
const canvasEl = document.getElementById('chart');
const chartAreaEl = document.getElementById('chartArea');

chartInstance = createChart(canvasEl, 'ring', getFilterState(), () => animState);
initOverlay(chartAreaEl);
initInteractions(chartInstance, animState);
renderStarfield();

// --- Entrance Animation ---
initEntrance();
const entranceStart = performance.now();
let entranceDone = false;

function runEntranceFrame() {
  const elapsed = performance.now() - entranceStart;
  const done = updateEntrance(elapsed);
  const progress = getEntranceProgress();
  chartInstance.data.datasets.forEach((ds, i) => {
    const p = progress[i] || 0;
    const depth = ds._depth || 0.5;
    const baseR = getCurrentMode() === 'size' ? (4 + ds._meta.gov * 2.2) : (5 + depth * 6);
    ds.pointRadius = baseR * p;
    const baseAlpha = ds._visible ? (0.5 + depth * 0.4) : 0.08;
    ds.backgroundColor = ds.backgroundColor.slice(0, 7) +
      Math.round(baseAlpha * p * 255).toString(16).padStart(2, '0');
  });
  chartInstance.update('none');
  if (!done) requestAnimationFrame(runEntranceFrame);
  else {
    entranceDone = true;
    chartInstance.data.datasets = buildDatasets(getCurrentMode(), getFilterState());
    chartInstance.update('none');
    requestAnimationFrame(idleLoop);
  }
}
requestAnimationFrame(runEntranceFrame);

// --- Idle Loop ---
let lastFrameTime = 0;
let chartDrawTimer = 0;

function idleLoop(timestamp) {
  const dt = lastFrameTime ? (timestamp - lastFrameTime) / 1000 : 0.016;
  lastFrameTime = timestamp;
  animState.time = timestamp;

  updateZoom(dt);
  updateSunView(dt);

  // Planet and/or Sun view — can crossfade during transitions
  if (planetCtx) planetCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (sunViewProgress > 0.01) renderSunView(timestamp);
  if (zoomState.active || zoomState.direction !== 0) renderPlanet(timestamp);

  // Chart gov rings — 10fps
  if (!zoomState.active) {
    chartDrawTimer += dt;
    if (chartDrawTimer > 0.1) { chartInstance.draw(); chartDrawTimer = 0; }
  }

  renderOverlay(chartInstance);
  requestAnimationFrame(idleLoop);
}

// --- Resize ---
function handleResize() {
  syncOverlay(chartAreaEl);
  renderStarfieldOnce();
  renderStarfield();
  resizePlanet();
}
const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(chartAreaEl);

// --- Audio bootstrap on first gesture (required by browsers) ---
let audioBooted = false;
function bootAudio() {
  if (audioBooted) return;
  audioBooted = true;
  ensureAudioContext();
  if (!getMuted()) startSpaceDrone();
}
document.addEventListener('click', bootAudio, { once: true });
document.addEventListener('keydown', bootAudio, { once: true });

// --- Sound Toggle (persistent bottom-right button) ---
const soundBtn = document.getElementById('sound-toggle');
const soundOn = soundBtn.querySelector('.sound-icon-on');
const soundOff = soundBtn.querySelector('.sound-icon-off');

// Sound is OFF by default — show the right icon state
soundBtn.classList.remove('active');
soundOn.style.display = 'none';
soundOff.style.display = '';
soundBtn.title = 'Enable sound';

soundBtn.addEventListener('click', () => {
  ensureAudioContext();
  const newMuted = !getMuted();
  setMuted(newMuted);
  soundBtn.classList.toggle('active', !newMuted);
  soundOn.style.display = newMuted ? 'none' : '';
  soundOff.style.display = newMuted ? '' : 'none';
  soundBtn.title = newMuted ? 'Enable sound' : 'Disable sound';
});

// --- Old header audio buttons (keep working if present) ---
const muteBtn = document.getElementById('mute-btn');
if (muteBtn) muteBtn.addEventListener('click', () => {
  ensureAudioContext();
  const m = !getMuted(); setMuted(m);
  muteBtn.classList.toggle('muted', m);
  // Sync the persistent sound button
  soundBtn.classList.toggle('active', !m);
  soundOn.style.display = m ? 'none' : '';
  soundOff.style.display = m ? '' : 'none';
});
