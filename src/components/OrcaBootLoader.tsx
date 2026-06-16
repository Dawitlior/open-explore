/**
 * OrcaBootLoader — THE single canonical full-screen loader for the platform.
 * Used everywhere: initial boot, route/dimension transitions, auth gates,
 * sign-out overlay. Do NOT introduce alternative full-screen spinners.
 *
 * Theme contract: the loader's background INHERITS whatever the current page
 * is using. We read the live `<body>` background-color and mirror it, so
 * mid-app transitions (theme swap between Orca / Journal / Backtest /
 * Weekly-Review snow theme etc.) keep the loader visually identical to the
 * surface beneath it. On the very first boot (no body bg yet) we fall back
 * to the Orca terminal navy.
 */
import { useEffect, useState } from 'react';

const FALLBACK_BG = 'radial-gradient(circle at 50% 40%, #08182f 0%, #061326 70%)';

function readCurrentSurface(): string {
  if (typeof window === 'undefined') return FALLBACK_BG;
  try {
    // Prefer an explicit CSS variable set by themed pages, then body color.
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const themed = cs.getPropertyValue('--orca-surface').trim()
      || cs.getPropertyValue('--bg').trim()
      || cs.getPropertyValue('--background').trim();
    if (themed) return themed;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
  } catch { /* noop */ }
  return FALLBACK_BG;
}

export const OrcaBootLoader = ({ label = 'Investment Terminal' }: { label?: string }) => {
  const [bg, setBg] = useState<string>(() => readCurrentSurface());
  useEffect(() => {
    // Re-sample after mount in case the themed page rendered just before us.
    setBg(readCurrentSurface());
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 28,
        background: bg,
        color: '#22d3ee',
        transition: 'background 0.35s ease',
      }}
    >
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(34,211,238,0.13)',
          borderTopColor: '#22d3ee',
          animation: 'orca-bl-spin 1.1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          border: '2px solid rgba(167,139,250,0.10)',
          borderBottomColor: '#a78bfa',
          animation: 'orca-bl-spin-rev 1.6s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#22d3ee', filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.55))',
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: 16, fontWeight: 700, letterSpacing: '0.15em',
        }}>
          OI
        </div>
      </div>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '0.32em',
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", color: '#e8eef9',
        }}>
          ORCA
        </div>
        <div style={{
          fontSize: 10, color: '#5d7090',
          letterSpacing: '0.4em', textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: '#22d3ee',
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
