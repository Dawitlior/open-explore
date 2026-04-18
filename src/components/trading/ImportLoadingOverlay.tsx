import { useEffect, useState, useMemo } from 'react';

interface Props {
  isRTL: boolean;
  fileName?: string;
  imported?: number;
  phase?: 'reading' | 'parsing' | 'validating' | 'saving' | 'done';
}

export default function ImportLoadingOverlay({ isRTL, fileName, imported = 0, phase = 'reading' }: Props) {
  const [counter, setCounter] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Smooth counter
  useEffect(() => {
    const id = setInterval(() => {
      setCounter(c => {
        if (c === imported) return c;
        const diff = imported - c;
        const step = Math.max(1, Math.ceil(Math.abs(diff) / 6));
        return c + (diff > 0 ? step : -step);
      });
    }, 30);
    return () => clearInterval(id);
  }, [imported]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    return () => clearInterval(id);
  }, []);

  const phases = useMemo(() => isRTL
    ? [
        { key: 'reading', label: 'קריאת הקובץ' },
        { key: 'parsing', label: 'ניתוח שורות' },
        { key: 'validating', label: 'אימות נתונים' },
        { key: 'saving', label: 'שמירה במאגר' },
        { key: 'done', label: 'הושלם' },
      ]
    : [
        { key: 'reading', label: 'Reading file' },
        { key: 'parsing', label: 'Parsing rows' },
        { key: 'validating', label: 'Validating' },
        { key: 'saving', label: 'Saving' },
        { key: 'done', label: 'Complete' },
      ],
  [isRTL]);

  const currentIdx = phases.findIndex(p => p.key === phase);
  const progress = phase === 'done' ? 100 : ((currentIdx + 1) / phases.length) * 90;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(6, 12, 24, 0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, direction: isRTL ? 'rtl' : 'ltr',
        animation: 'orcaOverlayIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes orcaOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orcaCardIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes orcaRingSpin { to { transform: rotate(360deg); } }
        @keyframes orcaShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes orcaPhaseIn { from { opacity: 0; transform: translateX(${isRTL ? '-' : ''}8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes orcaDotPulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.4); opacity: 1; } }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: 460,
          background: 'linear-gradient(180deg, rgba(20, 30, 50, 0.85), rgba(12, 20, 36, 0.85))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: 'clamp(28px, 5vw, 40px)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          fontFamily: '"Poppins", -apple-system, system-ui, sans-serif',
          color: '#f0f5ff',
          animation: 'orcaCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Spinner ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <svg viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0, animation: 'orcaRingSpin 1.4s linear infinite' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="url(#orcaGrad)" strokeWidth="3"
                strokeLinecap="round" strokeDasharray="60 188" />
              <defs>
                <linearGradient id="orcaGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600, color: '#f0f5ff',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              {counter}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          {isRTL ? 'מייבא נתוני מסחר' : 'Importing trades'}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28, fontSize: 13, color: 'rgba(240,245,255,0.55)' }}>
          {fileName ? fileName : (isRTL ? 'מעבד את הקובץ שלך' : 'Processing your file')}
        </div>

        {/* Progress bar */}
        <div style={{
          position: 'relative', height: 4, background: 'rgba(255,255,255,0.06)',
          borderRadius: 999, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
            borderRadius: 999,
            transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            animation: 'orcaShimmer 1.6s ease-in-out infinite',
          }} />
        </div>

        {/* Phase list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {phases.map((p, i) => {
            const done = i < currentIdx || phase === 'done';
            const active = i === currentIdx && phase !== 'done';
            return (
              <div key={p.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: done || active ? 1 : 0.35,
                transition: 'opacity 0.4s ease',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: done ? '#22c55e' : active ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  animation: active ? 'orcaDotPulse 1.2s ease-in-out infinite' : undefined,
                  boxShadow: done ? '0 0 8px rgba(34,197,94,0.6)' : active ? '0 0 8px rgba(59,130,246,0.6)' : undefined,
                  flexShrink: 0,
                }} />
                <div style={{
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: done ? 'rgba(34,197,94,0.9)' : active ? '#f0f5ff' : 'rgba(240,245,255,0.7)',
                }}>
                  {p.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'rgba(240,245,255,0.4)',
          fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.5,
        }}>
          <span>{elapsed.toFixed(1)}s</span>
          <span>ORCA</span>
        </div>
      </div>
    </div>
  );
}
