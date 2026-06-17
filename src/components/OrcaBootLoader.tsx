/**
 * OrcaBootLoader — THE single canonical full-screen loader for the platform.
 * Used everywhere: initial boot, route/dimension transitions, auth gates,
 * sign-out overlay, dashboard bootstrap. Do NOT introduce alternative
 * full-screen spinners.
 *
 * Theme contract: background inherits the current page surface and the
 * orbit accent inherits the active theme's `--primary` token, so the
 * loader looks identical across midnight / indigo / platinum / graphite.
 */
import { useEffect, useState } from 'react';

const FALLBACK_BG = 'radial-gradient(circle at 50% 40%, #08182f 0%, #061326 70%)';
const FALLBACK_ACCENT = '184 100% 50%'; // cyan

function readVar(name: string): string {
  if (typeof window === 'undefined') return '';
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  catch { return ''; }
}

function readCurrentSurface(): string {
  if (typeof window === 'undefined') return FALLBACK_BG;
  try {
    const themed = readVar('--orca-surface') || readVar('--bg');
    if (themed) return themed;
    const bgHsl = readVar('--background');
    if (bgHsl) return `radial-gradient(circle at 50% 40%, hsl(${bgHsl} / 0.96) 0%, hsl(${bgHsl}) 70%)`;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
  } catch { /* noop */ }
  return FALLBACK_BG;
}

function readAccent(): string {
  return readVar('--primary') || FALLBACK_ACCENT;
}

export const OrcaBootLoader = ({ label = 'Investment Terminal' }: { label?: string }) => {
  const [bg, setBg] = useState<string>(() => readCurrentSurface());
  const [accent, setAccent] = useState<string>(() => readAccent());
  useEffect(() => { setBg(readCurrentSurface()); setAccent(readAccent()); }, []);

  const accentColor = `hsl(${accent})`;
  const accentSoft  = `hsl(${accent} / 0.13)`;
  const accentGlow  = `hsl(${accent} / 0.55)`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 28,
        background: bg,
        color: accentColor,
        transition: 'background 0.35s ease',
      }}
    >
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${accentSoft}`,
          borderTopColor: accentColor,
          animation: 'orca-bl-spin 1.1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          border: `2px solid ${accentSoft}`,
          borderBottomColor: accentColor,
          opacity: 0.7,
          animation: 'orca-bl-spin-rev 1.6s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor, filter: `drop-shadow(0 0 12px ${accentGlow})`,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: 16, fontWeight: 700, letterSpacing: '0.15em',
        }}>
          OI
        </div>
      </div>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '0.32em',
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          color: 'hsl(var(--foreground))',
        }}>
          ORCA
        </div>
        <div style={{
          fontSize: 10, color: 'hsl(var(--muted-foreground))',
          letterSpacing: '0.4em', textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: accentColor,
              opacity: 0.35,
              animation: `orca-bl-pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes orca-bl-spin { to { transform: rotate(360deg); } }
        @keyframes orca-bl-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes orca-bl-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
};

export default OrcaBootLoader;
