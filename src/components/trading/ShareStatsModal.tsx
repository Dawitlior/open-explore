// =====================================================================
//  ORCA · SHARE STATS MODAL
//  ---------------------------------------------------------------------
//  Generates a polished 1080×1080 social-ready image summarising the
//  active portfolio: net R, win-rate, expectancy, best/worst symbol.
//  Zero fabricated numbers — everything is read from `stats` as-is;
//  missing fields render as "—".
// =====================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, Share2, Copy } from 'lucide-react';
import type { Trade } from '@/data/trades';
import { computeAnalytics } from '@/lib/trading-analytics';
import { parseTradeDate } from '@/components/weekly-review/lib/week-key';

type ShareRange = 'all' | 'month' | 'week' | 'day' | 'last10';

interface ShareStatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: any;
  isRTL: boolean;
  isMoney: boolean;
  /** Optional — enables the range selector (All / Month / Week / Day / Last 10). */
  trades?: Trade[];
}

const W = 1080;
const H = 1080;

function fmtR(v: number | undefined | null) {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${Number(v).toFixed(2)}R`;
}
function fmtPct(v: number | undefined | null) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(1)}%`;
}
function fmtMoney(v: number | undefined | null) {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}$${Math.abs(Number(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

async function paint(canvas: HTMLCanvasElement, stats: any, isRTL: boolean, isMoney: boolean, rangeLabel?: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  ctx.scale(dpr, dpr);

  // background — deep ORCA gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#06121f');
  bg.addColorStop(0.5, '#0a1a2e');
  bg.addColorStop(1, '#04101c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // faint radial glow
  const glow = ctx.createRadialGradient(W / 2, 260, 20, W / 2, 260, 620);
  glow.addColorStop(0, 'rgba(245,197,66,0.18)');
  glow.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // gold border
  ctx.strokeStyle = 'rgba(245,197,66,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const dir: CanvasTextAlign = isRTL ? 'right' : 'left';
  const startX = isRTL ? W - 96 : 96;

  // brand
  ctx.fillStyle = '#f5c542';
  ctx.font = '700 44px Poppins, system-ui, sans-serif';
  ctx.textAlign = dir;
  ctx.fillText('ORCA', startX, 140);
  ctx.fillStyle = 'rgba(232,237,245,0.55)';
  ctx.font = '600 22px "IBM Plex Mono", ui-monospace, monospace';
  const subLabel = rangeLabel
    ? (isRTL ? `תעודת ביצועים · ${rangeLabel}` : `PERFORMANCE CARD · ${rangeLabel.toUpperCase()}`)
    : (isRTL ? 'תעודת ביצועים · פורטפוליו פעיל' : 'PERFORMANCE CARD · ACTIVE PORTFOLIO');
  ctx.fillText(subLabel, startX, 180);

  // Big headline: Net R (or money)
  const headlineLabel = isRTL ? (isMoney ? 'תוחלת נטו' : 'תוחלת נטו (R)') : (isMoney ? 'Net P&L' : 'Net R');
  const headlineValue = isMoney ? fmtMoney(stats?.totalPnl) : fmtR(stats?.totalR);
  const headlineColor = (isMoney ? stats?.totalPnl : stats?.totalR) >= 0 ? '#22d3a5' : '#f16a6a';

  ctx.fillStyle = 'rgba(159,176,197,0.75)';
  ctx.font = '600 26px Poppins, system-ui, sans-serif';
  ctx.fillText(headlineLabel, startX, 300);

  ctx.fillStyle = headlineColor;
  ctx.font = '800 156px Poppins, system-ui, sans-serif';
  ctx.fillText(headlineValue, startX, 440);

  // Grid: 4 stat tiles
  const tiles: Array<{ label: string; value: string; color: string }> = [
    {
      label: isRTL ? 'אחוז הצלחה' : 'Win Rate',
      value: fmtPct(stats?.winRate),
      color: '#7fb2ff',
    },
    {
      label: isRTL ? 'תוחלת ממוצעת' : 'Avg Expectancy',
      value: stats?.expectancyR != null ? fmtR(stats.expectancyR) : '—',
      color: '#f5c542',
    },
    {
      label: isRTL ? 'עסקאות' : 'Trades',
      value: stats?.totalTrades != null ? String(stats.totalTrades) : '—',
      color: '#e8edf5',
    },
    {
      label: isRTL ? 'דראודאון מקס.' : 'Max Drawdown',
      value: stats?.maxDrawdown != null ? `${Number(stats.maxDrawdown).toFixed(1)}%` : '—',
      color: '#ffb066',
    },
  ];

  const gridTop = 560;
  const gridGap = 24;
  const tileW = (W - 96 * 2 - gridGap) / 2;
  const tileH = 190;

  tiles.forEach((tile, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 96 + col * (tileW + gridGap);
    const y = gridTop + row * (tileH + gridGap);

    // panel
    ctx.fillStyle = 'rgba(15,26,44,0.85)';
    ctx.strokeStyle = 'rgba(245,197,66,0.18)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, tileW, tileH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = isRTL ? 'right' : 'left';
    const tx = isRTL ? x + tileW - 28 : x + 28;

    ctx.fillStyle = 'rgba(159,176,197,0.75)';
    ctx.font = '600 22px Poppins, system-ui, sans-serif';
    ctx.fillText(tile.label, tx, y + 52);

    ctx.fillStyle = tile.color;
    ctx.font = '800 72px Poppins, system-ui, sans-serif';
    ctx.fillText(tile.value, tx, y + 138);
  });

  // Footer strip
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,237,245,0.55)';
  ctx.font = '600 20px "IBM Plex Mono", ui-monospace, monospace';
  const stamp = new Date().toISOString().slice(0, 10);
  ctx.fillText(`orca · ${stamp}`, W / 2, H - 68);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function ShareStatsModal({ open, onClose, stats, isRTL, isMoney }: ShareStatsModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState<null | 'copy' | 'download' | 'share'>(null);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    paint(c, stats, isRTL, isMoney);
  }, [open, stats, isRTL, isMoney]);

  const toBlob = (): Promise<Blob | null> =>
    new Promise((res) => {
      const c = canvasRef.current;
      if (!c) return res(null);
      c.toBlob((b) => res(b), 'image/png', 0.95);
    });

  const download = async () => {
    setBusy('download');
    setNote('');
    const b = await toBlob();
    if (!b) return setBusy(null);
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orca-stats-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
    setNote(isRTL ? 'הורד ✓' : 'Downloaded ✓');
  };

  const copy = async () => {
    setBusy('copy');
    setNote('');
    try {
      const b = await toBlob();
      if (!b) throw new Error('no blob');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CI: any = (window as any).ClipboardItem;
      if (!navigator.clipboard || !CI) throw new Error('unsupported');
      await navigator.clipboard.write([new CI({ 'image/png': b })]);
      setNote(isRTL ? 'הועתק ללוח ✓' : 'Copied to clipboard ✓');
    } catch {
      setNote(isRTL ? 'העתקה לא נתמכת בדפדפן — השתמש/י בהורדה' : 'Copy not supported here — use Download');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    setNote('');
    try {
      const b = await toBlob();
      if (!b) throw new Error('no blob');
      const file = new File([b], 'orca-stats.png', { type: 'image/png' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: 'ORCA', text: isRTL ? 'התעודה שלי מ-ORCA' : 'My ORCA performance card' });
        setNote(isRTL ? 'נשלח ✓' : 'Shared ✓');
      } else {
        throw new Error('unsupported');
      }
    } catch {
      setNote(isRTL ? 'שיתוף לא נתמך — הורד/י ושתף/י ידנית' : 'Share not supported — download and share manually');
    } finally {
      setBusy(null);
    }
  };

  const overlay = useMemo(
    () => ({
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(4,10,20,0.82)',
      backdropFilter: 'blur(10px)',
      zIndex: 2147483200,
      display: open ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }),
    [open]
  );

  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a1626',
          border: '1px solid rgba(245,197,66,0.35)',
          borderRadius: 20,
          padding: 24,
          maxWidth: 560,
          width: '100%',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          fontFamily: 'Poppins, system-ui, sans-serif',
          color: '#e8edf5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>
              {isRTL ? 'תעודת ביצועים לשיתוף' : 'Shareable performance card'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(159,176,197,0.75)' }}>
              {isRTL ? '1080×1080 · מוכן לסטורי' : '1080×1080 · story-ready'}
            </span>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#9fb0c5',
              padding: 8,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'inline-flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            background: '#04101c',
            borderRadius: 14,
            padding: 10,
            border: '1px solid rgba(245,197,66,0.18)',
            marginBottom: 14,
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }} />
        </div>

        {note && (
          <div style={{ fontSize: 13, marginBottom: 10, color: '#7fb2ff', textAlign: 'center' }}>{note}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <button
            onClick={download}
            disabled={!!busy}
            style={btnStyle('#f5c542', '#06121f')}
          >
            <Download size={16} /> {isRTL ? 'הורד' : 'Download'}
          </button>
          <button onClick={copy} disabled={!!busy} style={btnStyle('transparent', '#e8edf5', true)}>
            <Copy size={16} /> {isRTL ? 'העתק' : 'Copy'}
          </button>
          <button onClick={share} disabled={!!busy} style={btnStyle('transparent', '#e8edf5', true)}>
            <Share2 size={16} /> {isRTL ? 'שתף' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, fg: string, outlined = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 14px',
    borderRadius: 12,
    background: bg,
    color: fg,
    border: outlined ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'Poppins, system-ui, sans-serif',
  };
}

export default ShareStatsModal;
