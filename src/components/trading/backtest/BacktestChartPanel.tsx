import { useEffect, useRef, useState } from 'react';
import { backtestDraftStore, useBacktestStore } from './backtest-draft-store';
import { lineToolToDraft } from './tv-mapping';
import { parseClipboard, readClipboardText } from './parse-clipboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

/**
 * BacktestChartPanel
 *
 * Hosts the free TradingView Advanced Chart widget and a mobile-first
 * "Smart Capture" sheet. The sheet supports:
 *   • One-tap clipboard paste with smart parsing (entry/sl/exit/mfe/mae/coin)
 *   • Manual typing with auto-direction inference
 *   • Symbol lock (chart symbol auto-feeds into the draft)
 *   • Keyboard: c=open, v=paste, ⌘/Ctrl+Enter=send, Esc=close
 *
 * All capture happens through the `CaptureAdapter` indirection, so wiring
 * the full Charting Library later is a one-file swap.
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

const BL = '#2563eb', BG = '#0c0f14', BG3 = '#161c26', BRD = '#1e2736', T1 = '#e8ecf1', T2 = '#8896ab', T3 = '#556277', G = '#0ecb81', RD = '#f6465d';

const inp = (mobile: boolean): React.CSSProperties => ({
  background: '#10141b', border: `1px solid ${BRD}`, borderRadius: 8,
  color: T1, padding: mobile ? '12px 12px' : '8px 10px',
  fontSize: mobile ? 15 : 12, width: '100%', direction: 'ltr',
  fontFamily: 'inherit', minHeight: mobile ? 44 : undefined,
});
const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: T3, marginBottom: 4, letterSpacing: 1 };

export default function BacktestChartPanel({ visible }: { visible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mobile = useIsMobile();
  const { sheetOpen, symbol } = useBacktestStore();
  const [localSymbol, setLocalSymbol] = useState(symbol);

  // Mount widget once
  useEffect(() => {
    let cancelled = false;
    loadTvScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const TV = window.TradingView;
        if (!TV) throw new Error('TradingView global missing');
        widgetRef.current = new TV.widget({
          autosize: true,
          symbol: localSymbol,
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
          hide_side_toolbar: mobile,
        });
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep store + local in sync if symbol changed externally
  useEffect(() => { setLocalSymbol(symbol); }, [symbol]);

  // ─── Capture sheet state ───
  const empty = { coin: '', entry: '', sl: '', exit: '', mfeP: '', maeP: '', notes: '' };
  const [form, setForm] = useState(empty);
  const [parseHint, setParseHint] = useState<string>('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset + autofocus when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      setForm((f) => ({ ...empty, coin: f.coin || symbol.split(':').pop()?.replace(/USDT$|USD$/, '') || '' }));
      setParseHint('');
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  const pasteAndParse = async () => {
    const txt = await readClipboardText();
    if (!txt) {
      toast.error('הקלפבורד ריק או חסומה הרשאה');
      return;
    }
    const p = parseClipboard(txt);
    if (p.confidence < 0.3) {
      toast.error('לא זוהו ערכי עסקה בטקסט');
      setParseHint('לא זוהה — נסה: entry: 64250  sl: 63800  exit: 65700');
      return;
    }
    setForm((f) => ({
      ...f,
      coin: p.coin || f.coin,
      entry: p.entry ?? f.entry,
      sl: p.sl ?? f.sl,
      exit: p.exit ?? f.exit,
      mfeP: p.mfeP ?? f.mfeP,
      maeP: p.maeP ?? f.maeP,
    }));
    setParseHint(`✓ ${p.source} · ביטחון ${(p.confidence * 100).toFixed(0)}%`);
    toast.success('נטען מהקלפבורד');
  };

  const sendForReview = () => {
    if (!form.entry || !form.sl || !form.exit) {
      toast.error('חסר Entry / SL / Exit');
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const eN = parseFloat(form.entry), sN = parseFloat(form.sl);
    const draft = lineToolToDraft({
      lineId: `manual-${now}`,
      toolName: eN > sN ? 'LineToolRiskRewardLong' : 'LineToolRiskRewardShort',
      points: [
        { time: now - 3600, price: eN || 0 },
        { time: now, price: parseFloat(form.exit) || 0 },
        { time: now - 3600, price: sN || 0 },
      ],
      symbol: form.coin || symbol,
      status: 'ready_to_commit',
      prev: { mfeP: form.mfeP, maeP: form.maeP, notes: form.notes },
    });
    backtestDraftStore.upsert(draft);
    backtestDraftStore.closeSheet();
    setForm(empty);
  };

  // Keyboard: v=paste, ⌘/Ctrl+Enter=send, Esc=close — only while sheet open
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const inField = tgt?.tagName === 'INPUT' || tgt?.tagName === 'TEXTAREA';
      if (e.key === 'Escape') { e.preventDefault(); backtestDraftStore.closeSheet(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendForReview(); }
      else if (e.key === 'v' && (e.metaKey || e.ctrlKey) && !inField) { e.preventDefault(); pasteAndParse(); }
      else if (e.key === 'p' && !inField && !e.metaKey && !e.ctrlKey) { e.preventDefault(); pasteAndParse(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, form]);

  const dir = parseFloat(form.entry) > parseFloat(form.sl) ? 'LONG' :
              parseFloat(form.sl) > parseFloat(form.entry) ? 'SHORT' : '—';

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

      {/* Floating Capture FAB — thumb-zone bottom on mobile, corner on desktop */}
      <button
        onClick={() => backtestDraftStore.openSheet()}
        aria-label="לכוד עסקה"
        style={{
          position: 'absolute',
          bottom: mobile ? 'calc(20px + env(safe-area-inset-bottom))' : 20,
          insetInlineEnd: mobile ? '50%' : 20,
          transform: mobile ? 'translateX(50%)' : 'none',
          zIndex: 20,
          background: `linear-gradient(135deg, ${BL}, #06b6d4)`,
          border: 'none', borderRadius: mobile ? 999 : 12,
          color: '#fff', fontSize: mobile ? 15 : 13, fontWeight: 800,
          padding: mobile ? '16px 28px' : '12px 18px',
          cursor: 'pointer', boxShadow: '0 14px 40px rgba(37,99,235,0.45)',
          fontFamily: 'inherit', minHeight: 56, minWidth: mobile ? 200 : undefined,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>⚡</span> לכוד עסקה
        {!mobile && <span style={{ fontSize: 10, opacity: .7, marginInlineStart: 6, fontWeight: 600 }}>C</span>}
      </button>

      {/* ── Mobile bottom-sheet / Desktop popover ── */}
      {sheetOpen && (
        <>
          <div
            onClick={() => backtestDraftStore.closeSheet()}
            style={{
              position: mobile ? 'fixed' : 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              animation: 'fi .2s ease-out',
            }}
          />
          <div
            role="dialog"
            aria-label="Smart Capture"
            style={{
              position: mobile ? 'fixed' : 'absolute',
              ...(mobile
                ? { left: 0, right: 0, bottom: 0, borderRadius: '20px 20px 0 0', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }
                : { bottom: 88, insetInlineEnd: 20, width: 340, borderRadius: 14 }),
              zIndex: 31, background: BG3, border: `1px solid ${BRD}`,
              padding: mobile ? '14px 16px 20px' : 16,
              color: T1, fontFamily: 'inherit',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
              maxHeight: mobile ? '85vh' : undefined,
              overflowY: 'auto',
              animation: mobile ? 'sheetUp .3s cubic-bezier(.16,1,.3,1)' : 'pop .25s cubic-bezier(.16,1,.3,1)',
              direction: 'rtl',
            }}
          >
            {/* drag handle on mobile */}
            {mobile && <div style={{ width: 40, height: 4, background: BRD, borderRadius: 4, margin: '0 auto 12px' }} />}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>⚡ SMART CAPTURE</div>
              <button
                onClick={() => backtestDraftStore.closeSheet()}
                aria-label="סגור"
                style={{ background: 'none', border: 'none', color: T2, fontSize: 22, cursor: 'pointer', padding: 4, minWidth: 32, minHeight: 32 }}
              >×</button>
            </div>

            {/* Paste row — primary action */}
            <button
              onClick={pasteAndParse}
              style={{
                width: '100%', marginBottom: 10,
                background: `linear-gradient(135deg, ${BL}22, #06b6d422)`,
                border: `1px dashed ${BL}88`, borderRadius: 10,
                color: BL, padding: mobile ? '14px 12px' : '11px 12px',
                fontSize: mobile ? 14 : 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', minHeight: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>📋</span> הדבק וחלץ אוטומטית
              {!mobile && <span style={{ fontSize: 9, opacity: .6, fontWeight: 600 }}>P</span>}
            </button>
            {parseHint && (
              <div style={{ fontSize: 10, color: T2, marginBottom: 10, padding: '6px 8px', background: BG, borderRadius: 6, direction: 'ltr', textAlign: 'left' }}>
                {parseHint}
              </div>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <div style={lbl}>SYMBOL</div>
                <input ref={firstInputRef} style={inp(mobile)} value={form.coin} placeholder="BTC"
                  onChange={(e) => setForm({ ...form, coin: e.target.value.toUpperCase() })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div><div style={lbl}>ENTRY</div><input style={inp(mobile)} inputMode="decimal" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} /></div>
                <div><div style={lbl}>STOP</div><input style={inp(mobile)} inputMode="decimal" value={form.sl} onChange={(e) => setForm({ ...form, sl: e.target.value })} /></div>
                <div><div style={lbl}>EXIT</div><input style={inp(mobile)} inputMode="decimal" value={form.exit} onChange={(e) => setForm({ ...form, exit: e.target.value })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, alignItems: 'end' }}>
                <div><div style={lbl}>MFE</div><input style={inp(mobile)} inputMode="decimal" value={form.mfeP} onChange={(e) => setForm({ ...form, mfeP: e.target.value })} /></div>
                <div><div style={lbl}>MAE</div><input style={inp(mobile)} inputMode="decimal" value={form.maeP} onChange={(e) => setForm({ ...form, maeP: e.target.value })} /></div>
                <div style={{
                  background: dir === 'LONG' ? G + '20' : dir === 'SHORT' ? RD + '20' : BG,
                  border: `1px solid ${dir === 'LONG' ? G : dir === 'SHORT' ? RD : BRD}`,
                  color: dir === 'LONG' ? G : dir === 'SHORT' ? RD : T3,
                  borderRadius: 8, padding: mobile ? '12px' : '8px', textAlign: 'center',
                  fontSize: 12, fontWeight: 800, minHeight: mobile ? 44 : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{dir}</div>
              </div>
              <div>
                <div style={lbl}>NOTES</div>
                <textarea
                  style={{ ...inp(mobile), height: mobile ? 60 : 48, resize: 'none' }}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <button
                onClick={sendForReview}
                disabled={!form.entry || !form.sl || !form.exit}
                style={{
                  marginTop: 4, background: BL, border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: mobile ? 15 : 13, fontWeight: 800,
                  padding: mobile ? '14px 16px' : '11px 14px',
                  cursor: 'pointer', minHeight: 48,
                  opacity: (!form.entry || !form.sl || !form.exit) ? 0.35 : 1,
                  fontFamily: 'inherit',
                  boxShadow: '0 10px 24px rgba(37,99,235,0.35)',
                }}
              >
                שלח לאישור {!mobile && <span style={{ fontSize: 10, opacity: .7, marginInlineStart: 6 }}>⌘↵</span>}
              </button>
              <div style={{ fontSize: 9, color: T3, lineHeight: 1.5, marginTop: 2, textAlign: 'center' }}>
                טיפ: צייר Long/Short Position בגרף → העתק → לחץ "הדבק". כשנשדרג ל-Charting Library הלכידה תהיה אוטומטית.
              </div>
            </div>
          </div>

          <style>{`@keyframes sheetUp{0%{transform:translateY(100%);}100%{transform:translateY(0);}}`}</style>
        </>
      )}
    </div>
  );
}
