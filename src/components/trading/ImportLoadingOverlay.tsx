import { useEffect, useState, useMemo } from 'react';

interface Props {
  isRTL: boolean;
  fileName?: string;
  imported?: number;
  phase?: 'reading' | 'parsing' | 'validating' | 'saving' | 'done';
}

// Pre-generate stable candlestick bars
const BARS = 32;
const seedBars = () => Array.from({ length: BARS }, (_, i) => {
  const trend = Math.sin(i * 0.35) * 30 + i * 1.2;
  const open = 50 + trend + (Math.random() - 0.5) * 8;
  const close = open + (Math.random() - 0.5) * 14;
  const high = Math.max(open, close) + Math.random() * 6;
  const low = Math.min(open, close) - Math.random() * 6;
  return { open, close, high, low, bull: close >= open };
});

export default function ImportLoadingOverlay({ isRTL, fileName, imported = 0, phase = 'reading' }: Props) {
  const [bars, setBars] = useState(seedBars);
  const [tick, setTick] = useState(0);
  const [counter, setCounter] = useState(0);

  // Animate candlesticks rolling left → simulating live market feed
  useEffect(() => {
    const id = setInterval(() => {
      setBars(prev => {
        const last = prev[prev.length - 1];
        const open = last.close;
        const close = open + (Math.random() - 0.45) * 16;
        const high = Math.max(open, close) + Math.random() * 7;
        const low = Math.min(open, close) - Math.random() * 7;
        return [...prev.slice(1), { open, close, high, low, bull: close >= open }];
      });
      setTick(t => t + 1);
    }, 180);
    return () => clearInterval(id);
  }, []);

  // Ease the displayed counter toward the real imported value
  useEffect(() => {
    const id = setInterval(() => {
      setCounter(c => {
        if (c === imported) return c;
        const diff = imported - c;
        const step = Math.max(1, Math.ceil(Math.abs(diff) / 8));
        return c + (diff > 0 ? step : -step);
      });
    }, 40);
    return () => clearInterval(id);
  }, [imported]);

  const phaseLabel = useMemo(() => {
    const map = isRTL
      ? { reading: 'קורא קובץ', parsing: 'מנתח שורות', validating: 'מאמת נתונים', saving: 'שומר למאגר', done: 'הושלם' }
      : { reading: 'Reading file', parsing: 'Parsing rows', validating: 'Validating', saving: 'Persisting', done: 'Complete' };
    return map[phase];
  }, [phase, isRTL]);

  // Normalize bars to viewBox 0..100
  const { minV, maxV } = useMemo(() => {
    const lows = bars.map(b => b.low); const highs = bars.map(b => b.high);
    return { minV: Math.min(...lows) - 4, maxV: Math.max(...highs) + 4 };
  }, [bars]);
  const norm = (v: number) => 100 - ((v - minV) / (maxV - minV)) * 100;

  // Build SMA polyline
  const sma = useMemo(() => {
    const win = 5;
    return bars.map((_, i) => {
      const slice = bars.slice(Math.max(0, i - win + 1), i + 1);
      const avg = slice.reduce((a, b) => a + b.close, 0) / slice.length;
      return avg;
    });
  }, [bars]);

  const barW = 100 / BARS;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at center, rgba(6,19,38,0.96) 0%, rgba(2,8,18,0.99) 100%)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, direction: isRTL ? 'rtl' : 'ltr',
        animation: 'orcaImportFadeIn 0.35s ease-out',
      }}
    >
      <style>{`
        @keyframes orcaImportFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orcaImportRise { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes orcaScanline { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes orcaTickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes orcaPulseDot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes orcaGlow { 0%, 100% { box-shadow: 0 0 30px rgba(34,197,94,0.25), inset 0 0 40px rgba(34,197,94,0.05); } 50% { box-shadow: 0 0 50px rgba(34,197,94,0.45), inset 0 0 60px rgba(34,197,94,0.1); } }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: 720,
          background: 'linear-gradient(180deg, rgba(15,30,55,0.95), rgba(8,18,35,0.95))',
          border: '1px solid rgba(34,197,94,0.35)',
          borderRadius: 18, padding: 'clamp(18px, 4vw, 32px)',
          fontFamily: '"IBM Plex Mono", monospace',
          color: '#e8f4ff',
          animation: 'orcaImportRise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), orcaGlow 3s ease-in-out infinite',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Scanline */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
          animation: 'orcaScanline 2.2s linear infinite', pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', animation: 'orcaPulseDot 1.2s ease-in-out infinite', boxShadow: '0 0 12px #22c55e' }} />
            <div style={{ fontSize: 11, letterSpacing: 2, color: '#22c55e', fontWeight: 700 }}>
              {isRTL ? 'ORCA • שידור חי' : 'ORCA • LIVE FEED'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#7a9bc4', letterSpacing: 1 }}>
            {String(new Date().toISOString().slice(11, 19))} UTC
          </div>
        </div>

        {/* Candlestick chart */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16 / 7',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,30,60,0.2))',
          border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10,
          overflow: 'hidden', marginBottom: 16,
        }}>
          {/* Grid */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {[20, 40, 60, 80].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(122,155,196,0.12)" strokeWidth="0.15" strokeDasharray="0.5 0.8" />
            ))}
            {/* Candlesticks */}
            {bars.map((b, i) => {
              const x = i * barW + barW / 2;
              const yHigh = norm(b.high);
              const yLow = norm(b.low);
              const yOpen = norm(b.open);
              const yClose = norm(b.close);
              const top = Math.min(yOpen, yClose);
              const h = Math.max(0.5, Math.abs(yOpen - yClose));
              const color = b.bull ? '#22c55e' : '#ef4444';
              const isLast = i === bars.length - 1;
              return (
                <g key={i} opacity={isLast ? 1 : 0.85}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="0.25" />
                  <rect x={x - barW * 0.32} y={top} width={barW * 0.64} height={h} fill={color} opacity={isLast ? 1 : 0.88}>
                    {isLast && <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite" />}
                  </rect>
                </g>
              );
            })}
            {/* SMA line */}
            <polyline
              fill="none" stroke="#fbbf24" strokeWidth="0.4" strokeLinejoin="round" strokeLinecap="round"
              points={sma.map((v, i) => `${i * barW + barW / 2},${norm(v)}`).join(' ')}
              opacity="0.85"
            />
          </svg>

          {/* Last price tag */}
          <div style={{
            position: 'absolute', top: 8, [isRTL ? 'left' : 'right']: 8,
            background: bars[bars.length - 1].bull ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
            border: `1px solid ${bars[bars.length - 1].bull ? '#22c55e' : '#ef4444'}`,
            color: bars[bars.length - 1].bull ? '#22c55e' : '#ef4444',
            padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1,
          }}>
            {bars[bars.length - 1].close.toFixed(2)} {bars[bars.length - 1].bull ? '▲' : '▼'}
          </div>
        </div>

        {/* Counter + phase */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Stat label={isRTL ? 'עסקאות נטענו' : 'Trades loaded'} value={counter.toLocaleString()} accent="#22c55e" />
          <Stat label={isRTL ? 'שלב נוכחי' : 'Current phase'} value={phaseLabel} accent="#fbbf24" />
          <Stat label={isRTL ? 'מצב מערכת' : 'System'} value={phase === 'done' ? (isRTL ? 'מוכן' : 'READY') : 'BUSY'} accent={phase === 'done' ? '#22c55e' : '#3b82f6'} />
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
            animation: 'orcaScanline 1.4s linear infinite',
            width: '40%',
          }} />
        </div>

        {/* Ticker tape */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(34,197,94,0.2)', borderBottom: '1px solid rgba(34,197,94,0.2)', padding: '6px 0', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', gap: 24, whiteSpace: 'nowrap', animation: 'orcaTickerScroll 22s linear infinite', willChange: 'transform' }}>
            {[...Array(2)].map((_, dup) => (
              <div key={dup} style={{ display: 'flex', gap: 24 }}>
                {['BTC +2.4%', 'ETH +1.1%', 'SOL +5.7%', 'NVDA +0.9%', 'TSLA -1.2%', 'EUR/USD +0.3%', 'GOLD +0.6%', 'SPX +0.4%'].map((s, i) => {
                  const up = s.includes('+');
                  return (
                    <span key={`${dup}-${i}`} style={{ fontSize: 11, color: up ? '#22c55e' : '#ef4444', fontWeight: 600, letterSpacing: 1 }}>
                      {s}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {fileName && (
          <div style={{ marginTop: 12, fontSize: 10, color: '#7a9bc4', textAlign: 'center', letterSpacing: 1 }}>
            📂 {fileName} • tick #{tick}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)', border: `1px solid ${accent}33`,
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 9, color: '#7a9bc4', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent, fontFamily: '"IBM Plex Mono", monospace' }}>{value}</div>
    </div>
  );
}
