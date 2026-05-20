/**
 * audio-unlock — installs a one-shot listener that resumes the
 * Web Audio context on the very first user gesture. Required on
 * mobile Safari / iOS where AudioContext starts in 'suspended'.
 */
let installed = false;

export const installAudioUnlock = (getCtx: () => AudioContext | null | undefined) => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const unlock = () => {
    const ctx = getCtx();
    try { ctx?.resume?.(); } catch { /* noop */ }
    // Silent buffer kick — guarantees iOS audio path is hot.
    try {
      if (ctx) {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch { /* noop */ }
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('touchend', unlock);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('click', unlock);
  };
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('touchend', unlock, { once: true, passive: true });
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('click', unlock, { once: true });
};
