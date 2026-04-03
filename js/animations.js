/* animations.js — PERFORMANCE-OPTIMIZED
   Static starfield (rendered once), lightweight zoom, planet, minimal overlay */

// ═══════════════════════════════════════════
// STARFIELD — rendered ONCE to offscreen canvas, composited each frame
// ═══════════════════════════════════════════
let starCanvas = null;
let starCtx = null;
let starBuffer = null; // offscreen canvas
let starBufferCtx = null;
const STAR_COUNT = 180;

function initStarfield() {
  starCanvas = document.getElementById('starfield');
  if (!starCanvas) return;
  starCtx = starCanvas.getContext('2d');
  starBuffer = document.createElement('canvas');
  starBufferCtx = starBuffer.getContext('2d');
  renderStarfieldOnce();
}

function resizeStarfield() { /* no-op, handled by renderStarfieldOnce */ }

function renderStarfieldOnce() {
  if (!starCanvas || !starBuffer) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  starCanvas.width = w * dpr;
  starCanvas.height = h * dpr;
  starCanvas.style.width = w + 'px';
  starCanvas.style.height = h + 'px';
  starBuffer.width = w * dpr;
  starBuffer.height = h * dpr;

  const ctx = starBufferCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = Math.random() * 1.8 + 0.3;
    const brightness = 0.2 + Math.random() * 0.6;
    const hue = Math.random() < 0.12 ? (200 + Math.random() * 40) : 220;
    const sat = Math.random() < 0.2 ? 30 : 5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${75 + brightness * 20}%, ${brightness})`;
    ctx.fill();
    if (brightness > 0.6) {
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, 80%, ${brightness * 0.08})`;
      ctx.fill();
    }
  }
}

// Just blit the static buffer — near zero cost
function renderStarfield() {
  if (!starCtx || !starBuffer) return;
  starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
  starCtx.drawImage(starBuffer, 0, 0);
}

// ═══════════════════════════════════════════
// ZOOM STATE — pure camera, no effects
// ═══════════════════════════════════════════
var zoomState = {
  active: false,
  progress: 0,
  direction: 0,
  dotColor: '#4d9fff',
  dotGov: 5,
  dotActive: false,
  dotType: 'tool',
  label: '',
  startX: 0, startY: 0, // screen position of the clicked dot
};

function startZoomIn(screenX, screenY, color, gov, active, type, label) {
  zoomState.active = true;
  zoomState.progress = 0;
  zoomState.direction = 1;
  zoomState.dotColor = color;
  zoomState.dotGov = gov;
  zoomState.dotActive = active;
  zoomState.dotType = type;
  zoomState.label = label || '';
  zoomState.startX = screenX;
  zoomState.startY = screenY;
}

function startZoomOut() {
  zoomState.direction = -1;
}

function updateZoom(dt) {
  if (zoomState.direction === 0) return;
  zoomState.progress += zoomState.direction * 2.5 * dt;
  if (zoomState.progress >= 1) { zoomState.progress = 1; zoomState.direction = 0; }
  if (zoomState.progress <= 0) { zoomState.progress = 0; zoomState.direction = 0; zoomState.active = false; }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
}

// ═══════════════════════════════════════════
// SUN VIEW — hyper-realistic sun with sunspots and solar flares
// ═══════════════════════════════════════════
var sunViewActive = false;
var sunViewProgress = 0; // 0=hidden, 1=full

function startSunView() { sunViewActive = true; }
function stopSunView() { sunViewActive = false; }

function updateSunView(dt) {
  const target = sunViewActive ? 1 : 0;
  sunViewProgress += (target - sunViewProgress) * Math.min(1, dt * 3);
  if (Math.abs(sunViewProgress - target) < 0.005) sunViewProgress = target;
}

// Pre-generate noise texture for sun surface (once)
let sunNoiseCanvas = null;
function ensureSunNoise(size) {
  if (sunNoiseCanvas && sunNoiseCanvas.width === size) return;
  sunNoiseCanvas = document.createElement('canvas');
  sunNoiseCanvas.width = size; sunNoiseCanvas.height = size;
  const ctx = sunNoiseCanvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  // Layered pseudo-Perlin: multiple octaves of random for turbulent plasma look
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Hash-based value noise at multiple scales
      let val = 0;
      for (let oct = 0; oct < 4; oct++) {
        const scale = 4 + oct * 8;
        const nx = Math.sin(x / scale * 3.14 + oct * 17) * Math.cos(y / scale * 2.7 + oct * 13);
        val += (nx * 0.5 + 0.5) / (oct + 1);
      }
      val = val / 1.5; // normalize roughly 0-1
      // Map to solar colors: bright yellow-white to deep orange-red
      const r = 200 + val * 55;
      const g = 120 + val * 100;
      const b = 20 + val * 40;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function renderSunView(time) {
  if (!planetCtx || sunViewProgress < 0.01) return;
  const ctx = planetCtx;
  const w = window.innerWidth, h = window.innerHeight;

  const p = easeInOutCubic(sunViewProgress);
  const cx = w * 0.38, cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.22;
  const radius = maxR * p;
  if (radius < 2) return;
  const t = time / 1000; // time in seconds

  ctx.save();
  ctx.globalAlpha = p;

  // ═══ CORONA — layered, asymmetric, streaming ═══
  for (let c = 0; c < 4; c++) {
    const cR = radius * (1.8 + c * 0.7);
    const cAlpha = (0.04 - c * 0.008) * p;
    // Asymmetric corona — stretched toward different angles
    const stretchAngle = t * 0.05 + c * 0.8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + Math.cos(stretchAngle) * 0.15, 1 + Math.sin(stretchAngle) * 0.15);
    ctx.translate(-cx, -cy);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, cR);
    grad.addColorStop(0, `rgba(255, 200, 80, ${cAlpha * 1.5})`);
    grad.addColorStop(0.3, `rgba(255, 140, 40, ${cAlpha})`);
    grad.addColorStop(0.7, `rgba(200, 80, 20, ${cAlpha * 0.3})`);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
  }

  // ═══ PHOTOSPHERE — textured surface using noise ═══
  const texSize = Math.max(64, Math.min(256, Math.round(radius)));
  ensureSunNoise(texSize);

  // Draw noise texture as the sun body (clipped to circle)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();

  // Rotate the texture slowly for surface movement
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.02);
  ctx.translate(-cx, -cy);

  // Draw the pre-generated noise texture scaled to fill the sun
  ctx.drawImage(sunNoiseCanvas, cx - radius, cy - radius, radius * 2, radius * 2);

  // Second layer offset and blended for depth
  ctx.globalAlpha = 0.4;
  ctx.translate(cx, cy);
  ctx.rotate(t * -0.015 + 1);
  ctx.translate(-cx, -cy);
  ctx.drawImage(sunNoiseCanvas, cx - radius * 0.9, cy - radius * 0.9, radius * 1.8, radius * 1.8);
  ctx.globalAlpha = p;
  ctx.restore();

  // ═══ CHROMOSPHERE — thin bright rim ═══
  const chromGrad = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.04);
  chromGrad.addColorStop(0, 'transparent');
  chromGrad.addColorStop(0.4, 'rgba(255, 80, 20, 0.15)');
  chromGrad.addColorStop(0.7, 'rgba(255, 50, 10, 0.25)');
  chromGrad.addColorStop(0.85, 'rgba(255, 100, 30, 0.12)');
  chromGrad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
  ctx.fillStyle = chromGrad; ctx.fill();

  // ═══ LIMB DARKENING — strong edge darkening ═══
  const limbGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  limbGrad.addColorStop(0, 'transparent');
  limbGrad.addColorStop(0.5, 'transparent');
  limbGrad.addColorStop(0.8, 'rgba(120, 30, 0, 0.2)');
  limbGrad.addColorStop(0.95, 'rgba(80, 15, 0, 0.45)');
  limbGrad.addColorStop(1, 'rgba(40, 5, 0, 0.6)');
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = limbGrad; ctx.fill();

  // ═══ SUNSPOTS — darker convection downdrafts ═══
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2); ctx.clip();
  for (let s = 0; s < 8; s++) {
    const sAngle = t * 0.04 + s * 0.785;
    const sDist = radius * (0.15 + (s % 3) * 0.2);
    const sx = cx + Math.cos(sAngle) * sDist;
    const sy = cy + Math.sin(sAngle * 0.5 + s * 0.7) * sDist * 0.6;
    const fromCenter = Math.sqrt((sx-cx)**2 + (sy-cy)**2);
    if (fromCenter > radius * 0.8) continue;

    // Umbra (dark core)
    const uR = radius * (0.02 + Math.abs(Math.sin(s * 4.1)) * 0.025);
    const uGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, uR);
    uGrad.addColorStop(0, 'rgba(40, 10, 0, 0.5)');
    uGrad.addColorStop(0.6, 'rgba(80, 25, 5, 0.3)');
    uGrad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(sx, sy, uR, 0, Math.PI * 2);
    ctx.fillStyle = uGrad; ctx.fill();

    // Penumbra (lighter ring around umbra)
    const pR = uR * 2.2;
    const pGrad = ctx.createRadialGradient(sx, sy, uR * 0.8, sx, sy, pR);
    pGrad.addColorStop(0, 'rgba(100, 40, 10, 0.2)');
    pGrad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(sx, sy, pR, 0, Math.PI * 2);
    ctx.fillStyle = pGrad; ctx.fill();
  }
  ctx.restore();

  // ═══ SPECULAR HOTSPOT — bright region for 3D pop ═══
  const specGrad = ctx.createRadialGradient(
    cx - radius * 0.2, cy - radius * 0.15, 0,
    cx - radius * 0.2, cy - radius * 0.15, radius * 0.5
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 240, 0.15)');
  specGrad.addColorStop(0.3, 'rgba(255, 240, 200, 0.06)');
  specGrad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = specGrad; ctx.fill();

  // ═══ LABEL ═══
  ctx.fillStyle = `rgba(255, 230, 170, ${0.6 * p})`;
  ctx.font = "700 14px 'Syne', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('THE FISCHER GROUP', cx, cy + radius + 30);

  ctx.restore();
}

// ═══════════════════════════════════════════
// PLANET — lightweight 3D sphere with rotating name
// ═══════════════════════════════════════════
let planetCanvas = null;
let planetCtx = null;

function initPlanet() {
  planetCanvas = document.getElementById('planet-canvas');
  if (!planetCanvas) return;
  planetCtx = planetCanvas.getContext('2d');
  resizePlanet();
}

function resizePlanet() {
  if (!planetCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  planetCanvas.width = window.innerWidth * dpr;
  planetCanvas.height = window.innerHeight * dpr;
  planetCanvas.style.width = window.innerWidth + 'px';
  planetCanvas.style.height = window.innerHeight + 'px';
  if (planetCtx) planetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderPlanet(time) {
  if (!planetCtx) return;
  const ctx = planetCtx; // MUST be first — all drawing uses ctx
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  if (!zoomState.active || zoomState.progress < 0.01) return;

  const p = easeInOutCubic(zoomState.progress);
  const fadeIn = Math.min(1, p / 0.4);

  // Planet flies from dot position to display position
  const destX = w * 0.38, destY = h * 0.5;
  const baseX = zoomState.startX + (destX - zoomState.startX) * p;
  const baseY = zoomState.startY + (destY - zoomState.startY) * p;

  // Subtle orbit drift once arrived
  const orbitAngle = time / 8000;
  const arrived = Math.max(0, (p - 0.7) / 0.3);
  const planetX = baseX + Math.cos(orbitAngle) * 10 * arrived;
  const planetY = baseY + Math.sin(orbitAngle * 0.7) * 6 * arrived;

  const maxRadius = Math.min(w, h) * 0.18;
  const radius = 4 + (maxRadius - 4) * p;
  const rotation = time / 1200;

  // Light source — off-screen upper-right (no visible sun in planet view)
  const lightAngle = -0.6; // upper-right direction
  const lx = planetX + Math.cos(lightAngle) * radius * 0.35;
  const ly = planetY + Math.sin(lightAngle) * radius * 0.35;

  // ─── Planet ───
  let baseHue, baseSat, baseLit;
  if (zoomState.dotActive) { baseHue = 215; baseSat = 80; baseLit = 55; }
  else if (zoomState.dotType === 'model') { baseHue = 225; baseSat = 25; baseLit = 48; }
  else { baseHue = 160; baseSat = 70; baseLit = 45; }
  const govFactor = zoomState.dotGov / 10;

  ctx.save();
  ctx.globalAlpha = fadeIn;

  // Atmosphere glow
  const atmos = ctx.createRadialGradient(planetX, planetY, radius*0.85, planetX, planetY, radius*2);
  atmos.addColorStop(0, `hsla(${baseHue}, ${baseSat}%, ${baseLit+20}%, ${0.1+govFactor*0.08})`);
  atmos.addColorStop(0.5, `hsla(${baseHue}, ${baseSat}%, ${baseLit}%, 0.03)`);
  atmos.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(planetX, planetY, radius*2, 0, Math.PI*2);
  ctx.fillStyle = atmos; ctx.fill();

  // Sphere lit by sun direction
  const sphere = ctx.createRadialGradient(lx, ly, radius*0.05, planetX, planetY, radius);
  sphere.addColorStop(0, `hsla(${baseHue}, ${baseSat-10}%, ${baseLit+28}%, 1)`);
  sphere.addColorStop(0.4, `hsla(${baseHue}, ${baseSat}%, ${baseLit+5}%, 1)`);
  sphere.addColorStop(0.8, `hsla(${baseHue}, ${baseSat+5}%, ${baseLit-12}%, 1)`);
  sphere.addColorStop(1, `hsla(${baseHue}, ${baseSat}%, ${baseLit-28}%, 1)`);
  ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI*2);
  ctx.fillStyle = sphere; ctx.fill();

  // Surface bands + name (clipped)
  ctx.save();
  ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI*2); ctx.clip();
  for (let b = 0; b < 6; b++) {
    const bandY = planetY - radius + (2*radius/6)*b + Math.sin(rotation+b)*3;
    ctx.fillStyle = `hsla(${baseHue+(b%2?12:-8)}, ${baseSat-10}%, ${baseLit+(b%2?8:-4)}%, 0.05)`;
    ctx.fillRect(planetX-radius, bandY, radius*2, radius/6*0.5);
  }
  // Rotating name
  if (zoomState.label && radius > 30) {
    const nameText = zoomState.label.toUpperCase();
    const fontSize = Math.max(16, radius * 0.22);
    ctx.font = `800 ${fontSize}px 'Syne', sans-serif`;
    const tw = ctx.measureText(nameText).width;
    const totalTravel = tw + radius * 2;
    const rawOff = ((time * 0.025) % totalTravel);
    const textX = planetX + radius - rawOff;
    const dist = (textX + tw/2 - planetX) / radius;
    const alpha = Math.max(0, 1 - dist*dist) * 0.6;
    const sc = 0.7 + (1 - Math.abs(dist)) * 0.3;
    if (alpha > 0.01) {
      ctx.save();
      ctx.translate(textX+tw/2, planetY); ctx.scale(sc, 1); ctx.translate(-(textX+tw/2), -planetY);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(nameText, textX, planetY);
      ctx.restore();
    }
  }
  ctx.restore();

  // Specular from light direction (save ref for ring occlusion redraw)
  const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius*0.5);
  spec.addColorStop(0, 'rgba(255,255,255,0.2)');
  spec.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  spec.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI*2);
  ctx.fillStyle = spec; ctx.fill();

  // Governance rings — proper 3D: draw back half, then planet, then front half
  // gov 1 = 0 rings, gov 2 = 1, gov 4 = 2, gov 6 = 3, gov 8 = 4, gov 10 = 5
  const ringCount = Math.max(0, Math.ceil((zoomState.dotGov - 1) / 2));
  if (ringCount > 0) {
    // Ring parameters — gentle tilts, slow speeds, slight variation
    const ringParams = [];
    for (let r = 0; r < ringCount; r++) {
      const tilt = 0.22 + r * 0.04; // gentle tilt progression: 0.22 to 0.38
      const speed = (0.15 + r * 0.03) * (r % 2 ? -1 : 1); // alternate direction, gentle speed
      const rot = rotation * speed + r * 0.8;
      const dist = radius * (1.3 + r * 0.12);
      const alpha = (0.18 + govFactor * 0.15) * (1 - r * 0.1);
      const width = 1.5 + govFactor * 0.6;
      const hue = baseHue + (r % 2 ? 8 : -5);
      ringParams.push({ tilt, rot, dist, alpha, width, hue });
    }

    // Draw BACK halves of rings (behind the planet)
    ctx.save();
    ctx.translate(planetX, planetY);
    for (const rp of ringParams) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rp.dist, rp.dist * rp.tilt, rp.rot, 0, Math.PI); // back half only
      ctx.strokeStyle = `hsla(${rp.hue}, ${baseSat-15}%, ${baseLit+22}%, ${rp.alpha * 0.4})`;
      ctx.lineWidth = rp.width;
      ctx.stroke();
    }
    ctx.restore();

    // Re-draw planet on top to occlude back ring halves
    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphere; ctx.fill();
    // Re-apply specular
    ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI * 2);
    ctx.fillStyle = spec; ctx.fill();
    ctx.restore();

    // Draw FRONT halves of rings (in front of the planet)
    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.translate(planetX, planetY);
    for (const rp of ringParams) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rp.dist, rp.dist * rp.tilt, rp.rot, Math.PI, Math.PI * 2); // front half
      ctx.strokeStyle = `hsla(${rp.hue}, ${baseSat-15}%, ${baseLit+22}%, ${rp.alpha})`;
      ctx.lineWidth = rp.width;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Rim light opposite the light source
  const rimAngle = lightAngle + Math.PI;
  const rimX = planetX + Math.cos(rimAngle)*radius*0.1;
  const rimY = planetY + Math.sin(rimAngle)*radius*0.1;
  const rim = ctx.createRadialGradient(rimX, rimY, radius*0.85, planetX, planetY, radius);
  rim.addColorStop(0, 'transparent'); rim.addColorStop(0.8, 'transparent');
  rim.addColorStop(1, `hsla(${baseHue}, ${baseSat}%, ${baseLit+30}%, 0.15)`);
  ctx.beginPath(); ctx.arc(planetX, planetY, radius, 0, Math.PI*2);
  ctx.fillStyle = rim; ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════
// OVERLAY — minimal, only active during hover
// ═══════════════════════════════════════════
let overlayCanvas = null;
let overlayCtx = null;
let activeGlow = null;
let entranceProgress = [];

function initOverlay(chartArea) {
  overlayCanvas = document.getElementById('overlay-canvas');
  if (!overlayCanvas) return;
  overlayCtx = overlayCanvas.getContext('2d');
  syncOverlay(chartArea);
}

function syncOverlay(chartArea) {
  if (!overlayCanvas || !chartArea) return;
  const rect = chartArea.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  overlayCanvas.width = rect.width * dpr;
  overlayCanvas.height = rect.height * dpr;
  overlayCanvas.style.width = rect.width + 'px';
  overlayCanvas.style.height = rect.height + 'px';
  if (overlayCtx) overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initEntrance() { entranceProgress = COMPANIES.map(() => 0); }
function getEntranceProgress() { return entranceProgress; }

function updateEntrance(elapsed) {
  let allDone = true;
  for (let i = 0; i < COMPANIES.length; i++) {
    const st = i * 80;
    if (elapsed < st) { entranceProgress[i] = 0; allDone = false; }
    else { const t = Math.min(1, (elapsed-st)/350); entranceProgress[i] = 1-Math.pow(1-t,3); if (t<1) allDone = false; }
  }
  return allDone;
}

function addRipple() { /* disabled for performance */ }

function setQuadrantGlow(quadrant, color) {
  if (!quadrant) { if (activeGlow) activeGlow.targetAlpha = 0; return; }
  activeGlow = { quadrant, color, alpha: activeGlow ? activeGlow.alpha : 0, targetAlpha: 0.06 };
}

let focusRing = null;
function setFocusRing(x, y, color) {
  if (x === null) { focusRing = null; return; }
  if (!overlayCanvas) return;
  const rect = overlayCanvas.getBoundingClientRect();
  focusRing = { x: x-rect.left, y: y-rect.top, color: color || '#ff4d6a' };
}

// Only redraws when there's active glow or focus ring
function renderOverlay(chart) {
  if (!overlayCtx || !overlayCanvas) return;
  if (!activeGlow && !focusRing) { overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); return; }

  const ctx = overlayCtx;
  const w = overlayCanvas.width / (window.devicePixelRatio || 1);
  const h = overlayCanvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  const area = chart.chartArea;
  if (!area) return;

  if (activeGlow) {
    activeGlow.alpha += (activeGlow.targetAlpha - activeGlow.alpha) * 0.08;
    if (activeGlow.alpha > 0.003) {
      const mx = chart.scales.x.getPixelForValue(50);
      const my = chart.scales.y.getPixelForValue(50);
      let qx,qy,qw,qh;
      switch(activeGlow.quadrant) {
        case 'tl': qx=area.left;qy=area.top;qw=mx-area.left;qh=my-area.top;break;
        case 'tr': qx=mx;qy=area.top;qw=area.right-mx;qh=my-area.top;break;
        case 'bl': qx=area.left;qy=my;qw=mx-area.left;qh=area.bottom-my;break;
        case 'br': qx=mx;qy=my;qw=area.right-mx;qh=area.bottom-my;break;
      }
      ctx.save(); ctx.globalAlpha=activeGlow.alpha; ctx.fillStyle=activeGlow.color;
      ctx.fillRect(qx,qy,qw,qh); ctx.restore();
    }
    if (activeGlow.targetAlpha===0 && activeGlow.alpha<0.003) activeGlow=null;
  }

  if (focusRing) {
    const now = performance.now();
    ctx.save(); ctx.beginPath(); ctx.arc(focusRing.x,focusRing.y,20,0,Math.PI*2);
    ctx.strokeStyle=focusRing.color; ctx.lineWidth=2; ctx.setLineDash([4,4]);
    ctx.globalAlpha=0.6+Math.sin(now/300)*0.3; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
}
