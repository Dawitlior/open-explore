import { useEffect, useRef, useState } from 'react';
import { backtestDraftStore } from './backtest-draft-store';
import { lineToolToDraft } from './tv-mapping';

/**
 * BacktestChartPanel
 *
 * Mounts the free TradingView Advanced Chart widget (tv.js) in an iframe-backed
 * container and exposes a "Capture Trade" overlay. The public widget does NOT
 * expose drawing-event subscriptions (that requires the gated Charting Library),
 * so we provide a one-shot capture button: the user fills entry/sl/exit/symbol
 * from what they see on the chart and we build the draft via `lineToolToDraft`.
 *
 * If/when we license the full Charting Library, wiring `useTvCapture` to
 * `widget.activeChart().subscribe('drawing_event', ...)` is a drop-in upgrade.
 */

declare global {
  interface Window {
    TradingView?: any;
  }
}

const TV_SRC = 'https://s3.tradingview.com/tv.js';

function loadTvScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.TradingView) return resolve();
    const existing = document.querySelector(`script[src="${TV_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('TV load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = TV_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('TV load failed'));
    document.head.appendChild(s);
  });
}

const BL = '#2563eb', BG3 = '#161c26', BRD = '#1e2736', T1 = '#e8ecf1', T2 = '#8896ab', T3 = '#556277', G = '#0ecb81', RD = '#f6465d';
const inp: React.CSSProperties = {
  background: '#10141b', border: `1px solid ${BRD}`, borderRadius: 6,
  color: T1, padding: '6px 8px', fontSize: 12, width: '100%', direction: 'ltr',
};

export default function BacktestChartPanel({ visible }: { visible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');

  // Mount the widget exactly once. We never unmount on tab switch — the
  // parent toggles visibility via display:none so chart state survives.
  useEffect(() => {
    let cancelled = false;
    loadTvScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const TV = window.TradingView;
        if (!TV) throw new Error('TradingView global missing');
        widgetRef.current = new TV.widget({
          autosize: true,
          symbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0c0f14',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          studies: [],
          hide_side_toolbar: false,
        });
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // Intentionally empty deps — single mount for the workspace lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Quick Capture overlay ───
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ coin: 'BTC', entry: '', sl: '', exit: '', mfeP: '', maeP: '', notes: '' });

  const captureNow = () => {
    const now = Math.floor(Date.now() / 1000);
    const draft = lineToolToDraft({
      lineId: `tv-${now}`,
      toolName: parseFloat(form.entry) > parseFloat(form.sl) ? 'LineToolRiskRewardLong' : 'LineToolRiskRewardShort',
      points: [
        { time: now - 3600, price: parseFloat(form.entry) || 0 },
        { time: now, price: parseFloat(form.exit) || 0 },
        { time: now - 3600, price: parseFloat(form.sl) || 0 },
      ],
      symbol: form.coin || symbol,
      status: 'ready_to_commit',
      prev: { mfeP: form.mfeP, maeP: form.maeP, notes: form.notes },
    });
    backtestDraftStore.upsert(draft);
    setOpen(false);
    setForm({ coin: form.coin, entry: '', sl: '', exit: '', mfeP: '', maeP: '', notes: '' });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: visible ? 'block' : 'none' }}>
      <div
        id="orca-tv-host"
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, background: '#0c0f14' }}
      />
      {!ready && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T3, fontSize: 12 }}>
          טוען גרף TradingView…
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: T2, fontSize: 12, padding: 16, textAlign: 'center' }}>
          <div>TradingView לא נטען ({error}).</div>
          <a href="https://www.tradingview.com/chart/" target="_blank" rel="noreferrer" style={{ color: BL }}>פתח ב-TradingView.com</a>
        </div>
      )}

      {/* Floating Capture button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'absolute', bottom: 16, insetInlineEnd: 16, zIndex: 20,
          background: open ? BG3 : `linear-gradient(135deg, ${BL}, #06b6d4)`,
          border: `1px solid ${open ? BRD : BL}`, borderRadius: 10,
          color: '#fff', fontSize: 12, fontWeight: 800, padding: '10px 16px',
          cursor: 'pointer', boxShadow: '0 10px 30px rgba(37,99,235,0.35)',
          fontFamily: 'inherit',
        }}
      >
        {open ? '✕ סגור' : '⚡ לכוד עסקה'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', bottom: 64, insetInlineEnd: 16, zIndex: 21,
            background: BG3, border: `1px solid ${BRD}`, borderRadius: 12,
            padding: 14, width: 280, color: T1, fontFamily: 'inherit',
            boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: T2, marginBottom: 10, letterSpacing: 1 }}>QUICK CAPTURE</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <input style={inp} placeholder="Symbol (BTC)" value={form.coin} onChange={(e) => setForm({ ...form, coin: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input style={inp} placeholder="Entry" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} />
              <input style={inp} placeholder="Stop" value={form.sl} onChange={(e) => setForm({ ...form, sl: e.target.value })} />
              <input style={inp} placeholder="Exit" value={form.exit} onChange={(e) => setForm({ ...form, exit: e.target.value })} />
              <input style={inp} placeholder="Dir" value={parseFloat(form.entry) > parseFloat(form.sl) ? 'LONG' : parseFloat(form.sl) > parseFloat(form.entry) ? 'SHORT' : '—'} readOnly />
              <input style={inp} placeholder="MFE" value={form.mfeP} onChange={(e) => setForm({ ...form, mfeP: e.target.value })} />
              <input style={inp} placeholder="MAE" value={form.maeP} onChange={(e) => setForm({ ...form, maeP: e.target.value })} />
            </div>
            <textarea
              style={{ ...inp, height: 50, fontFamily: 'inherit', resize: 'none' }}
              placeholder="הערות…"
              maxLength={1000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 1000) })}
            />
            <button
              onClick={captureNow}
              disabled={!form.entry || !form.sl || !form.exit}
              style={{
                marginTop: 4, background: BL, border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 12, fontWeight: 800, padding: '10px 12px',
                cursor: 'pointer', opacity: (!form.entry || !form.sl || !form.exit) ? 0.35 : 1,
              }}
            >
              שלח לאישור ↵
            </button>
            <div style={{ fontSize: 9, color: T3, lineHeight: 1.4, marginTop: 4 }}>
              טיפ: צייר Long/Short Position על הגרף, העתק entry/sl/exit לכאן ולחץ שליחה.
              בגרסה עם רישיון Charting Library — הלכידה תקרה אוטומטית כשתסגור את העסקה.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
