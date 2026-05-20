import { useEffect, useState } from 'react';
import { backtestDraftStore, useBacktestDraft } from './backtest-draft-store';
import { previewR, type DraftBacktestTrade } from './tv-mapping';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const BL = '#2563eb', BG = '#0c0f14', BG3 = '#161c26', BRD = '#1e2736', T1 = '#e8ecf1', T2 = '#8896ab', T3 = '#556277', G = '#0ecb81', RD = '#f6465d';

const inp = (mobile: boolean): React.CSSProperties => ({
  background: '#10141b', border: `1px solid ${BRD}`, borderRadius: 8,
  color: T1, padding: mobile ? '12px 12px' : '8px 10px',
  fontSize: mobile ? 15 : 13, width: '100%', direction: 'ltr',
  fontFamily: 'inherit', minHeight: mobile ? 44 : undefined,
});
const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: T3, marginBottom: 4, letterSpacing: 1 };

interface Props {
  onCommit: (draft: DraftBacktestTrade) => void;
}

/**
 * CommitBacktestModal — mobile-first review screen.
 * - On mobile: full-height bottom sheet with thumb-friendly inputs (≥44px).
 * - On desktop: centered modal with ⌘/Ctrl+Enter to save, Esc to discard.
 * Opens automatically when the draft store flips to `ready_to_commit`.
 */
export default function CommitBacktestModal({ onCommit }: Props) {
  const draft = useBacktestDraft();
  const [local, setLocal] = useState<DraftBacktestTrade | null>(null);
  const mobile = useIsMobile();

  useEffect(() => {
    if (draft && draft.status === 'ready_to_commit') setLocal({ ...draft });
    else if (!draft) setLocal(null);
  }, [draft]);

  useEffect(() => {
    if (!local) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') discard();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  if (!local) return null;

  const r = previewR(local);
  const set = (k: keyof DraftBacktestTrade, v: string) => setLocal({ ...local, [k]: v });

  const discard = () => {
    backtestDraftStore.clear();
    setLocal(null);
  };

  const save = () => {
    if (!local) return;
    onCommit(local);
    toast.success(r != null ? `${r >= 0 ? '+' : ''}${r.toFixed(2)}R נשמר` : 'עסקה נשמרה');
    backtestDraftStore.clear();
    setLocal(null);
  };

  return (
    <div
      onClick={discard}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: mobile ? 0 : 20, fontFamily: 'inherit',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG3, border: `1px solid ${BRD}`,
          borderRadius: mobile ? '20px 20px 0 0' : 14,
          padding: mobile ? '12px 16px calc(20px + env(safe-area-inset-bottom))' : 22,
          width: mobile ? '100%' : 'min(480px, 100%)',
          maxHeight: mobile ? '92vh' : undefined,
          overflowY: 'auto',
          color: T1,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          animation: mobile ? 'sheetUp2 .3s cubic-bezier(.16,1,.3,1)' : 'fi .25s ease-out',
          direction: 'rtl',
        }}
      >
        {mobile && <div style={{ width: 40, height: 4, background: BRD, borderRadius: 4, margin: '0 auto 12px' }} />}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: mobile ? 12 : 14, fontWeight: 800, letterSpacing: 1 }}>
            COMMIT · <span style={{ color: BL }}>{local.coin || '—'}</span> ·{' '}
            <span style={{ color: local.dir === 'Long' ? G : RD }}>{local.dir || '—'}</span>
          </div>
          <button onClick={discard} aria-label="סגור"
            style={{ background: 'none', border: 'none', color: T3, fontSize: 22, cursor: 'pointer', padding: 4, minWidth: 32, minHeight: 32 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><div style={lbl}>ENTRY</div><input style={inp(mobile)} inputMode="decimal" value={local.entry} onChange={(e) => set('entry', e.target.value)} /></div>
          <div><div style={lbl}>STOP</div><input style={inp(mobile)} inputMode="decimal" value={local.sl} onChange={(e) => set('sl', e.target.value)} /></div>
          <div><div style={lbl}>EXIT</div><input style={inp(mobile)} inputMode="decimal" value={local.exit} onChange={(e) => set('exit', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><div style={lbl}>ENTRY TIME</div><input style={inp(mobile)} value={local.entryDT} onChange={(e) => set('entryDT', e.target.value)} placeholder="DD/MM/YYYY HH:mm" /></div>
          <div><div style={lbl}>EXIT TIME</div><input style={inp(mobile)} value={local.exitDT} onChange={(e) => set('exitDT', e.target.value)} placeholder="DD/MM/YYYY HH:mm" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div><div style={lbl}>MFE</div><input style={inp(mobile)} inputMode="decimal" value={local.mfeP} onChange={(e) => set('mfeP', e.target.value)} /></div>
          <div><div style={lbl}>MAE</div><input style={inp(mobile)} inputMode="decimal" value={local.maeP} onChange={(e) => set('maeP', e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>NOTES</div>
          <textarea
            style={{ ...inp(mobile), height: mobile ? 70 : 56, resize: 'none' }}
            value={local.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div style={{
          background: BG, border: `1px solid ${BRD}`, borderRadius: 10,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T3, fontWeight: 700 }}>R-MULTIPLE</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: r == null ? T3 : r >= 0 ? G : RD }}>
              {r == null ? '—' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}`}
            </div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: BRD }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T3, fontWeight: 700 }}>STATUS</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: BL }}>⚡ READY</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={discard}
            style={{
              background: 'none', border: `1px solid ${BRD}`, borderRadius: 10, color: T2,
              padding: mobile ? '12px 18px' : '9px 18px', fontSize: mobile ? 14 : 12,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
            }}
          >
            בטל {!mobile && <span style={{ opacity: .6 }}>Esc</span>}
          </button>
          <button
            onClick={save}
            style={{
              background: BL, border: 'none', borderRadius: 10, color: '#fff',
              padding: mobile ? '12px 24px' : '9px 22px',
              fontSize: mobile ? 15 : 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', minHeight: 44, flex: mobile ? 1 : undefined,
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
            }}
          >
            שמור {!mobile && <span style={{ opacity: .7 }}>⌘↵</span>}
          </button>
        </div>

        <style>{`@keyframes sheetUp2{0%{transform:translateY(100%);}100%{transform:translateY(0);}}`}</style>
      </div>
    </div>
  );
}
