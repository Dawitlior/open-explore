/**
 * APEX OS — Premium Sound Engine v2
 * Inspired by Bloomberg Terminal, Apple Pay, high-end fintech
 * Multi-layered Web Audio synthesis with convolution-style warmth
 */

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

function soundsAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  const p = (window as any).__orcaPrefs;
  return !p || p.soundsEnabled !== false;
}
function masterVol(): number {
  if (typeof window === 'undefined') return 1;
  const p = (window as any).__orcaPrefs;
  return typeof p?.soundVolume === 'number' ? Math.max(0, Math.min(1, p.soundVolume)) : 1;
}

// Pre-warm the AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const warm = () => { ctx(); window.removeEventListener('click', warm); window.removeEventListener('touchstart', warm); };
  window.addEventListener('click', warm, { once: true });
  window.addEventListener('touchstart', warm, { once: true });
}

/** Create a filtered noise burst — used for metallic/digital textures */
function noiseBurst(c: AudioContext, t: number, duration: number, freq: number, Q: number, vol: number, decay: number) {
  const len = c.sampleRate * duration;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = Q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + decay + 0.01);
}

/** Sine tone with attack-sustain-release envelope */
function tone(c: AudioContext, t: number, freq: number, endFreq: number | null, vol: number, attack: number, sustain: number, release: number) {
  const osc = c.createOscillator(); osc.type = 'sine';
  const g = c.createGain();
  const total = attack + sustain + release;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + total * 0.8);
  // Envelope
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + attack + sustain);
  g.gain.exponentialRampToValueAtTime(0.0001, t + total);
  osc.connect(g); g.connect(c.destination);
  osc.start(t); osc.stop(t + total + 0.05);
  return g;
}

/**
 * SOUND 1 — System Open (~550ms)
 * Three-note ascending chord with warm harmonics.
 * Think: powering on a Bloomberg terminal.
 */
export function playSystemOpen() {
  if (!soundsAllowed()) return;
    try {
    const c = ctx(); const t = c.currentTime;

    // Ascending triad: A3 → E4 → A4 (perfect fifth + octave = powerful & clean)
    tone(c, t,       220,  null, 0.04, 0.03, 0.15, 0.35);   // A3
    tone(c, t + 0.07, 330, null, 0.03, 0.03, 0.12, 0.35);   // E4
    tone(c, t + 0.14, 440, null, 0.025, 0.03, 0.10, 0.35);  // A4

    // Soft harmonic overtone (adds "digital" sheen)
    tone(c, t + 0.14, 880, null, 0.008, 0.02, 0.05, 0.3);   // A5 whisper

    // Subtle air texture
    noiseBurst(c, t, 0.08, 5000, 1.5, 0.005, 0.15);
  } catch { /* silent */ }
}

/**
 * SOUND 2 — Morning Analysis Lock (~400ms)
 * Two-note confirmation chime. Higher register, crisp.
 * Think: Apple Pay success ding.
 */
export function playMorningLock() {
  if (!soundsAllowed()) return;
    try {
    const c = ctx(); const t = c.currentTime;

    // E5 → G#5 (major third = positive, resolved)
    tone(c, t,        659,  null, 0.03,  0.01, 0.06, 0.18);  // E5
    tone(c, t + 0.09, 831,  null, 0.025, 0.01, 0.08, 0.25);  // G#5

    // Crystal shimmer (very quiet high partial)
    tone(c, t + 0.12, 1661, null, 0.005, 0.01, 0.03, 0.2);   // G#6

    // Micro-click for "lock" tactility
    noiseBurst(c, t, 0.015, 6000, 12, 0.04, 0.02);
  } catch { /* silent */ }
}

/**
 * SOUND 3 — End of Day Lock (~550ms)
 * Metallic double-click + descending confirmation tone.
 * Think: vault door sealing shut.
 */
export function playEODLock() {
  if (!soundsAllowed()) return;
    try {
    const c = ctx(); const t = c.currentTime;

    // Double metallic click
    noiseBurst(c, t,        0.02, 5500, 10, 0.10, 0.025);
    noiseBurst(c, t + 0.05, 0.02, 4200, 8,  0.07, 0.03);

    // Descending seal tone: D4 → A3 (perfect fourth down = closure)
    tone(c, t + 0.08, 294, 220, 0.025, 0.02, 0.12, 0.35);

    // Sub-bass warmth (felt more than heard)
    tone(c, t + 0.10, 110, null, 0.018, 0.03, 0.10, 0.30);

    // Tiny resonant ping at the end (like a lock clicking into place)
    noiseBurst(c, t + 0.12, 0.01, 3000, 15, 0.03, 0.04);
  } catch { /* silent */ }
}

/**
 * Risk Alert — Two descending tones, slightly urgent but elegant
 */
export function playRiskAlert() {
  if (!soundsAllowed()) return;
    try {
    const c = ctx(); const t = c.currentTime;

    tone(c, t,        660, 440, 0.035, 0.015, 0.05, 0.22);
    tone(c, t + 0.18, 550, 370, 0.030, 0.015, 0.05, 0.20);
  } catch { /* silent */ }
}
