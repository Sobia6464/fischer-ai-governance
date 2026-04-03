/* audio.js — Synthesized audio: space ambient drone, wind woosh, hover tones, chimes */

let audioCtx = null;
let masterGain = null;
let isMuted = true; // sound OFF by default

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = isMuted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getMuted() { return isMuted; }
function setMuted(muted) {
  isMuted = muted;
  if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.05);
  if (muted) stopSpaceDrone(); else startSpaceDrone();
}

/* ─── Space Ambient Drone ─── */
let droneNodes = null;

function startSpaceDrone() {
  if (droneNodes || isMuted) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  // Layer 1: very low sub-bass pad
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 38;
  const subGain = ctx.createGain();
  subGain.gain.value = 0;
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.start(now);
  subGain.gain.linearRampToValueAtTime(0.04, now + 2);

  // Layer 2: filtered noise — deep space rumble
  const bufLen = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 120;
  lp.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  noise.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);
  noiseGain.gain.linearRampToValueAtTime(0.025, now + 3);

  // Layer 3: slow LFO-modulated tone for "breathing" feel
  const pad = ctx.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = 65;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 8;
  lfo.connect(lfoG);
  lfoG.connect(pad.frequency);
  lfo.start(now);
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  pad.connect(padGain);
  padGain.connect(masterGain);
  pad.start(now);
  padGain.gain.linearRampToValueAtTime(0.02, now + 2);

  droneNodes = { sub, subGain, noise, noiseGain, lp, pad, padGain, lfo, lfoG };
}

function stopSpaceDrone() {
  if (!droneNodes) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const n = droneNodes;
  n.subGain.gain.linearRampToValueAtTime(0, now + 0.5);
  n.noiseGain.gain.linearRampToValueAtTime(0, now + 0.5);
  n.padGain.gain.linearRampToValueAtTime(0, now + 0.5);
  setTimeout(() => {
    try { n.sub.stop(); n.noise.stop(); n.pad.stop(); n.lfo.stop(); } catch(e) {}
  }, 700);
  droneNodes = null;
}

/* ─── Sun ambient — deeper rumble with crackling */
let sunNodes = null;

function startSunSound() {
  if (sunNodes || isMuted) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  // Lower the space drone
  if (droneNodes) {
    droneNodes.subGain.gain.linearRampToValueAtTime(0.01, now + 1);
    droneNodes.noiseGain.gain.linearRampToValueAtTime(0.008, now + 1);
    droneNodes.padGain.gain.linearRampToValueAtTime(0.005, now + 1);
  }

  // Solar wind — rushing, airy filtered noise with slow intensity variation
  const bufLen = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1);

  // Layer 1: Low rushing wind — bandpass at 80-250Hz
  const wind1 = ctx.createBufferSource();
  wind1.buffer = buf; wind1.loop = true;
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 140; bp1.Q.value = 0.5;
  // Slow intensity wavering via LFO on gain
  const lfo1 = ctx.createOscillator(); lfo1.type = 'sine'; lfo1.frequency.value = 0.12;
  const lfoG1 = ctx.createGain(); lfoG1.gain.value = 0.02;
  lfo1.connect(lfoG1);
  const wind1Gain = ctx.createGain(); wind1Gain.gain.value = 0;
  lfoG1.connect(wind1Gain.gain);
  lfo1.start(now);
  wind1.connect(bp1); bp1.connect(wind1Gain); wind1Gain.connect(masterGain);
  wind1.start(now);
  wind1Gain.gain.linearRampToValueAtTime(0.06, now + 2);

  // Layer 2: Higher airy rush — 400-1200Hz, softer
  const wind2 = ctx.createBufferSource();
  wind2.buffer = buf; wind2.loop = true;
  wind2.playbackRate.value = 1.3; // slight pitch shift for variety
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 600; bp2.Q.value = 0.4;
  const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.07;
  const lfoG2 = ctx.createGain(); lfoG2.gain.value = 0.008;
  lfo2.connect(lfoG2);
  const wind2Gain = ctx.createGain(); wind2Gain.gain.value = 0;
  lfoG2.connect(wind2Gain.gain);
  lfo2.start(now);
  wind2.connect(bp2); bp2.connect(wind2Gain); wind2Gain.connect(masterGain);
  wind2.start(now);
  wind2Gain.gain.linearRampToValueAtTime(0.025, now + 2.5);

  // Layer 3: Sub-bass presence — very low sine for felt rumble
  const sub = ctx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = 30;
  const subGain = ctx.createGain(); subGain.gain.value = 0;
  sub.connect(subGain); subGain.connect(masterGain);
  sub.start(now);
  subGain.gain.linearRampToValueAtTime(0.03, now + 1.5);

  sunNodes = { wind1, wind1Gain, bp1, lfo1, lfoG1, wind2, wind2Gain, bp2, lfo2, lfoG2, sub, subGain };
}

function stopSunSound() {
  if (!sunNodes) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const n = sunNodes;
  n.wind1Gain.gain.linearRampToValueAtTime(0, now + 1);
  n.wind2Gain.gain.linearRampToValueAtTime(0, now + 1);
  n.subGain.gain.linearRampToValueAtTime(0, now + 0.8);
  setTimeout(() => {
    try { n.wind1.stop(); n.wind2.stop(); n.lfo1.stop(); n.lfo2.stop(); n.sub.stop(); } catch(e) {}
  }, 1200);
  sunNodes = null;

  // Restore space drone volume
  if (droneNodes) {
    droneNodes.subGain.gain.linearRampToValueAtTime(0.04, now + 1);
    droneNodes.noiseGain.gain.linearRampToValueAtTime(0.025, now + 1);
    droneNodes.padGain.gain.linearRampToValueAtTime(0.02, now + 1);
  }
}

/* ─── Hover tones ─── */
const QUADRANT_FREQ = { tl: 329.63, tr: 261.63, bl: 493.88, br: 392.00 };
let lastHoverGain = null;

function playHoverTone(quadrant) {
  if (isMuted) return;
  const ctx = ensureAudioContext();
  const freq = QUADRANT_FREQ[quadrant] || 261.63;
  const now = ctx.currentTime;
  if (lastHoverGain) { try { lastHoverGain.gain.cancelScheduledValues(now); lastHoverGain.gain.setTargetAtTime(0, now, 0.02); } catch(e){} }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = 0;
  osc.connect(gain); gain.connect(masterGain);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + 0.18);
  osc.start(now); osc.stop(now + 0.2);
  lastHoverGain = gain;
}

/* ─── Mode chimes ─── */
const MODE_CHIMES = { ring: [261.63, 329.63], glow: [392.00, 329.63], size: [261.63, 392.00] };
function playModeChime(mode) {
  if (isMuted) return;
  const ctx = ensureAudioContext();
  const notes = MODE_CHIMES[mode] || MODE_CHIMES.ring;
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = freq; gain.gain.value = 0;
    osc.connect(gain); gain.connect(masterGain);
    const ns = now + i * 0.08;
    gain.gain.linearRampToValueAtTime(0.07, ns + 0.015);
    gain.gain.linearRampToValueAtTime(0, ns + 0.12);
    osc.start(ns); osc.stop(ns + 0.15);
  });
}

/* ─── Zoom Woosh — deep wind sound, low-pitched ─── */
function playZoomWoosh() {
  if (isMuted) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const duration = 0.9;

  // Filtered noise — LOW frequency sweep for deep wind
  const bufSize = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8; // wide band for wind
  filter.frequency.setValueAtTime(80, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + duration * 0.35);
  filter.frequency.exponentialRampToValueAtTime(150, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Deep sub-tone underneath
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(45, now);
  sub.frequency.linearRampToValueAtTime(80, now + duration * 0.3);
  sub.frequency.linearRampToValueAtTime(40, now + duration);
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.06, now + 0.1);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter); filter.connect(gain); gain.connect(masterGain);
  sub.connect(subGain); subGain.connect(masterGain);
  noise.start(now); noise.stop(now + duration);
  sub.start(now); sub.stop(now + duration);
}

/* Legacy compat */
function getHumActive() { return !isMuted; }
function toggleHum() { setMuted(!isMuted); return !isMuted; }
function startHum() { setMuted(false); }
function stopHum() { setMuted(true); }
function initOnGesture() { ensureAudioContext(); }
