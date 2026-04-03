# ISSUE-03: Sound Design and Audio System

## Summary

Implement a non-intrusive, purely Web Audio API sound system: quadrant-specific hover tones, mode switch chimes, an opt-in ambient hum, and a global mute toggle. All audio is synthesized — no external audio files or CDN audio libraries.

---

## Background

Sound is additive atmosphere, not a core function — it must enhance the experience for users who want it without annoying those who don't. The ambient hum is off by default. The mute toggle is always accessible. Hover tones are brief and pitched to feel data-expressive rather than UI-noisy.

Web Audio API requires a user gesture before the `AudioContext` can be created or resumed (browser autoplay policy). This means the audio system cannot initialize on page load — it must initialize on the first user interaction (click or keypress).

All audio logic lives in `js/audio.js`, which exports functions called by `js/interactions.js` and `js/main.js`.

---

## Acceptance Criteria

- [ ] **No external audio:** All sound is synthesized via the Web Audio API. No `<audio>` tags, no audio file fetches, no audio CDN libraries.
- [ ] **AudioContext lazy initialization:** The `AudioContext` is not created until the first user gesture (click or keypress anywhere on the page). Subsequent interactions reuse the same context. If the context enters a `suspended` state, it is resumed on the next gesture.
- [ ] **Global mute toggle:** A visible mute button (or icon) in the UI allows the user to silence all audio output. Mute state persists for the session. When muted, no tones, chimes, or hum play — the AudioContext may remain active but all gain nodes are set to 0.
- [ ] **Hover tones by quadrant:** Hovering over a bubble plays a brief, soft tone. The pitch is determined by the bubble's quadrant:
  - Top-right quadrant → C4 (261.63 Hz)
  - Top-left quadrant → E4 (329.63 Hz)
  - Bottom-right quadrant → G4 (392.00 Hz)
  - Bottom-left quadrant → B4 (493.88 Hz)
  - The tone fades in and out quickly (attack ~20ms, release ~150ms) to avoid clicks and abruptness.
- [ ] **No tone stacking:** If the user moves rapidly between bubbles, previously playing tones are faded out before the new tone starts. Only one hover tone plays at a time.
- [ ] **Mode switch chimes:** Switching between governance view modes (ring/glow/size) plays a short chime — a brief two- or three-note sequence that feels like a UI confirmation, not an alert. The three modes should produce distinguishable chimes.
- [ ] **Ambient hum:** An optional low-frequency drone (e.g., 40–60 Hz, very low gain) can be toggled on/off independently of the mute button. The hum is **off by default**. The toggle button uses a clear icon that communicates "ambient sound" — documented icon choice is required (see Technical Notes).
- [ ] **Ambient hum toggle is independent:** Muting globally silences the hum, but un-muting restores only what was previously active. If the user had the hum off before muting, un-muting does not turn the hum on.
- [ ] **No audio on page load:** Absolutely no sound plays without a user gesture. The first interaction initializes the context; audio only plays on subsequent intentional interactions.
- [ ] **Console warning suppressed:** The browser's "AudioContext was not allowed to start" warning should not appear. Achieve this by deferring `AudioContext` creation until after a user gesture, not by catching and ignoring the error.

---

## Technical Notes

- **AudioContext initialization pattern:**
  ```js
  let audioCtx = null;
  export function ensureAudioContext() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  ```
  Call `ensureAudioContext()` at the top of every audio-producing function.

- **Tone generation:** Use an `OscillatorNode` connected to a `GainNode` connected to `audioCtx.destination`. Set the oscillator type to `'sine'` for hover tones (soft, not harsh). Use a short `linearRampToValueAtTime` envelope:
  ```
  gain.linearRampToValueAtTime(targetGain, now + 0.02);  // attack
  gain.linearRampToValueAtTime(0, now + 0.17);           // release
  ```
  Stop the oscillator at `now + 0.2` to free resources.

- **Mode chime design:** A simple ascending or descending two-note sequence using the same oscillator approach works well. Suggested:
  - Ring mode → C4 → E4 (ascending minor third feel)
  - Glow mode → G4 → E4 (descending)
  - Size mode → C4 → G4 (open fifth)
  These are suggestions — the implementation may vary, but the three chimes must be distinguishable.

- **Ambient hum:** Use an `OscillatorNode` at 55 Hz (`'sine'` or `'triangle'`) with a gain of ~0.04. Connect through a master gain node that the mute toggle controls. Provide a `startHum()` and `stopHum()` export. The hum oscillator should be created once and started/stopped via `gainNode.gain.setValueAtTime()` rather than calling `.start()/.stop()` repeatedly, as oscillators cannot be restarted.

- **Ambient hum toggle icon:** The icon must communicate "background atmosphere" or "ambient sound" — not a simple speaker/mute icon (which is used for the global mute). Recommended options:
  - A waveform icon (sinusoidal line)
  - A set of radiating arcs (softer than the speaker icon)
  - A musical note with a small dot (indicating background)
  Document the chosen icon and rationale in a comment above the toggle HTML or in the JS that creates the element.

- **Mute state management:** Export a `getMuted()` and `setMuted(bool)` function. The mute state controls a master `GainNode` that all other nodes route through — so muting is instantaneous and doesn't require tracking every active oscillator.

- **Quadrant detection for tones:** Import the quadrant logic from `js/interactions.js` (or a shared utility) rather than duplicating it. The quadrant is determined by whether a company's x-axis value is above/below the median and y-axis value is above/below the median.

---

## Out of Scope

- Audio visualization (waveform display, frequency meters)
- More than one ambient layer
- MIDI or external instrument output
- Per-company unique tones (tones are per-quadrant only)
- Saving mute/hum preferences to localStorage (session only)

---

## Definition of Done

Hovering over bubbles plays soft quadrant-appropriate tones without stacking. Switching governance view modes triggers distinguishable chimes. The ambient hum toggle button is clearly identifiable and works independently of the mute toggle. Muting silences everything immediately. No audio plays on page load, and no browser console warnings about AudioContext autoplay policy appear.
