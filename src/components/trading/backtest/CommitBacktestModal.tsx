import { useEffect, useState } from 'react';
import { backtestDraftStore, useBacktestDraft } from './backtest-draft-store';
import { previewR, type DraftBacktestTrade } from './tv-mapping';
import { toast } from 'sonner';

const BL = '#2563eb', BG = '#0c0f14', BG3 = '#161c26', BRD = '#1e2736', T1 = '#e8ecf1', T2 = '#8896ab', T3 = '#556277', G = '#0ecb81', RD = '#f6465d';

const inp: React.CSSProperties = {
  background: '#10141b', border: `1px solid ${BRD}`, borderRadius: 6,
  color: T1, padding: '8px 10px', fontSize: 13, width: '100%', direction: 'ltr',
  fontFamily: 'inherit',
};
const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: T3, marginBottom: 3, letterSpacing: 1 };

interface Props {
  onCommit: (draft: DraftBacktestTrade) => void;
}

/**
 * CommitBacktestModal
 *
 * Opens automatically when the draft store flips to `ready_to_commit`.
 * On Save → calls onCommit(draft) (BacktestDimension performs `recalc()`
 * + `persist()`), shows a toast, and clears the draft. Chart stays mounted.
 */
export default function CommitBacktestModal({ onCommit }: Props) {
  const draft = useBacktestDraft();
  const [local, setLocal] = useState<DraftBacktestTrade | null>(null);

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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: 'inherit',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG3, border: `1px solid ${BRD}`, borderRadius: 14,
          padding: 22, width: 'min(480px, 100%)', color: T1,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          animation: 'fi .25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>
            COMMIT BACKTEST · <span style={{ color: BL }}>{local.coin || '—'}</span> ·{' '}
            <span style={{ color: local.dir === 'Long' ? G : RD }}>{local.dir || '—'}</span>
          </div>
          <button onClick={discard} style={{ background: 'none', border: 'none', color: T3, fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><div style={lbl}>ENTRY</div><input style={inp} value={local.entry} onChange={(e) => set('entry', e.target.value)} /></div>
          <div><div style={lbl}>STOP</div><input style={inp} value={local.sl} onChange={(e) => set('sl', e.target.value)} /></div>
          <div><div style={lbl}>EXIT</div><input style={inp} value={local.exit} onChange={(e) => set('exit', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><div style={lbl}>ENTRY TIME</div><input style={inp} value={local.entryDT} onChange={(e) => set('entryDT', e.target.value)} placeholder="DD/MM/YYYY HH:mm" /></div>
          <div><div style={lbl}>EXIT TIME</div><input style={inp} value={local.exitDT} onChange={(e) => set('exitDT', e.target.value)} placeholder="DD/MM/YYYY HH:mm" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div><div style={lbl}>MFE</div><input style={inp} value={local.mfeP} onChange={(e) => set('mfeP', e.target.value)} /></div>
          <div><div style={lbl}>MAE</div><input style={inp} value={local.maeP} onChange={(e) => set('maeP', e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>NOTES</div>
          <textarea
            style={{ ...inp, height: 56, resize: 'none' }}
            maxLength={1000}
            value={local.notes}
            onChange={(e) => set('notes', e.target.value.slice(0, 1000))}
          />
        </div>

        <div style={{
          background: BG, border: `1px solid ${BRD}`, borderRadius: 10,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T3, fontWeight: 700 }}>R-MULTIPLE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: r == null ? T3 : r >= 0 ? G : RD }}>
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
            style={{ background: 'none', border: `1px solid ${BRD}`, borderRadius: 8, color: T2, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            בטל (Esc)
          </button>
          <button
            onClick={save}
            style={{ background: BL, border: 'none', borderRadius: 8, color: '#fff', padding: '9px 22px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
          >
            שמור ↵
          </button>
        </div>
      </div>
    </div>
  );
}
