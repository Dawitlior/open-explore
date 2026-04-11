/**
 * APEX OS — Premium Sound Engine
 * Bloomberg Terminal × Apple Pay confirmation style
 * All sounds use Web Audio API with layered synthesis
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume();
  }
  return sharedCtx;
}

/** Warm reverb-like tail using delayed copies */
function addTail(ctx: AudioContext, source: AudioNode, dest: AudioNode, delayTime: number, gain: number) {
  const d = ctx.createDelay(); d.delayTime.value = delayTime;
  const g = ctx.createGain(); g.gain.value = gain;
  source.connect(d); d.connect(g); g.connect(dest);
}

/**
 * SOUND 1 — System Open
 * Smooth rising digital synth, warm and clean. ~500ms
 * Like activating a professional trading terminal.
 */
export function playSystemOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Layer 1: Warm sine sweep (fundamental)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.45);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.035, now + 0.06);
    g1.gain.setValueAtTime(0.035, now + 0.3);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.start(now); osc1.stop(now + 0.6);

    // Layer 2: Octave harmonic (adds richness)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.45);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.015, now + 0.08);
    g2.gain.setValueAtTime(0.015, now + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(now); osc2.stop(now + 0.55);

    // Layer 3: Soft noise burst for "digital" texture
    const bufLen = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 3000;
    nFilter.Q.value = 2;
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(0.008, now + 0.02);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.15);

    // Subtle reverb tail
    addTail(ctx, g1, ctx.destination, 0.08, 0.3);
    addTail(ctx, g2, ctx.destination, 0.12, 0.2);
  } catch { /* silent */ }
}

/**
 * SOUND 2 — Morning Analysis Lock
 * Soft confirmation chime, slightly higher pitch, short digital pulse. ~350ms
 * Like Apple Pay success but more subtle.
 */
export function playMorningLock() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Two-note chime (minor third interval = elegant)
    const notes = [
      { freq: 880, start: 0, dur: 0.2, vol: 0.03 },
      { freq: 1047, start: 0.08, dur: 0.25, vol: 0.025 },  // C6
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.start);
      g.gain.setValueAtTime(0, now + n.start);
      g.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.015);
      g.gain.setValueAtTime(n.vol, now + n.start + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + n.start); osc.stop(now + n.start + n.dur + 0.05);

      // Warm tail
      addTail(ctx, g, ctx.destination, 0.06, 0.25);
    });

    // Subtle high shimmer
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 2093; // C7
    sg.gain.setValueAtTime(0, now + 0.1);
    sg.gain.linearRampToValueAtTime(0.006, now + 0.12);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    shimmer.connect(sg); sg.connect(ctx.destination);
    shimmer.start(now + 0.1); shimmer.stop(now + 0.35);
  } catch { /* silent */ }
}

/**
 * SOUND 3 — End of Day Lock
 * Soft metallic lock click + subtle low confirmation tone. ~500ms
 * Like sealing a vault in a premium fintech app.
 */
export function playEODLock() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Metallic click (filtered noise burst)
    const clickLen = ctx.sampleRate * 0.04;
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) {
      clickData[i] = (Math.random() * 2 - 1);
    }
    const click = ctx.createBufferSource();
    click.buffer = clickBuf;
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 4500;
    clickFilter.Q.value = 8;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    click.connect(clickFilter); clickFilter.connect(clickGain); clickGain.connect(ctx.destination);
    click.start(now); click.stop(now + 0.05);

    // Second click (slightly delayed for "lock" feel)
    const click2 = ctx.createBufferSource();
    click2.buffer = clickBuf;
    const cf2 = ctx.createBiquadFilter();
    cf2.type = 'bandpass'; cf2.frequency.value = 3800; cf2.Q.value = 6;
    const cg2 = ctx.createGain();
    cg2.gain.setValueAtTime(0.08, now + 0.06);
    cg2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    click2.connect(cf2); cf2.connect(cg2); cg2.connect(ctx.destination);
    click2.start(now + 0.06); click2.stop(now + 0.12);

    // Low confirmation tone (descending = "sealed")
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.35);
    g.gain.setValueAtTime(0, now + 0.1);
    g.gain.linearRampToValueAtTime(0.025, now + 0.15);
    g.gain.setValueAtTime(0.025, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now + 0.1); osc.stop(now + 0.6);

    // Sub-bass warmth
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 165;
    sg.gain.setValueAtTime(0, now + 0.12);
    sg.gain.linearRampToValueAtTime(0.02, now + 0.18);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now + 0.12); sub.stop(now + 0.55);

    addTail(ctx, g, ctx.destination, 0.1, 0.2);
  } catch { /* silent */ }
}

/**
 * Risk Alert sound — kept separate, slightly urgent but not jarring
 */
export function playRiskAlert() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Two descending tones
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);

    // Second tone
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(550, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(370, now + 0.32);
    g2.gain.setValueAtTime(0, now + 0.18);
    g2.gain.linearRampToValueAtTime(0.035, now + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(now + 0.18); osc2.stop(now + 0.45);
  } catch { /* silent */ }
}
