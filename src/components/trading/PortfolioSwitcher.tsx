/**
 * PortfolioSwitcher — Stage 3 UI for Multi-Portfolio.
 *
 * Dark Terminal aesthetic. Shows the active portfolio, lists all portfolios,
 * lets the user create / rename / delete / set-default a portfolio. Plan tier
 * enforcement is intentionally NOT in this component — that lands in Stage 5.
 *
 * No view filtering happens here either. Switching the active portfolio just
 * updates global state; consumers wire themselves up in Stage 4.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import type { Portfolio } from '@/hooks/use-portfolios';

interface Props {
  isRTL: boolean;
  compact?: boolean;
}

const PALETTE = ['#22d3ee', '#34d399', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#60a5fa', '#f87171'];

export function PortfolioSwitcher({ isRTL, compact }: Props) {
  const {
    portfolios,
    activePortfolio,
    activePortfolioId,
    setActivePortfolioId,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    setDefault,
    loading,
    tier,
    tierMax,
    isPortfolioLocked,
    canCreate,
  } = useActivePortfolio();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [starting, setStarting] = useState<string>('0');
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!editing && !creating) return;
    if (editing) {
      setName(editing.name);
      setCurrency(editing.currency);
      setStarting(String(editing.starting_balance ?? 0));
      setColor(editing.color || PALETTE[0]);
    } else {
      setName('');
      setCurrency('USD');
      setStarting('0');
      setColor(PALETTE[portfolios.length % PALETTE.length]);
    }
    setErr(null);
  }, [editing, creating, portfolios.length]);

  const dot = (c?: string | null) => (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: c || '#64748b', boxShadow: `0 0 6px ${(c || '#64748b')}80`, flexShrink: 0,
      }}
    />
  );

  const closeForm = () => { setEditing(null); setCreating(false); setErr(null); };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setErr(isRTL ? 'נא להזין שם תיק' : 'Please enter a portfolio name'); return; }
    const parsed = Number(starting);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setErr(isRTL ? 'הון התחלתי חייב להיות מספר חיובי' : 'Starting balance must be a positive number');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const updated = await updatePortfolio(editing.id, { name: trimmed, currency, starting_balance: parsed, color });
        if (!updated) throw new Error('update_failed');
      } else {
        const created = await createPortfolio({ name: trimmed, currency, starting_balance: parsed, color });
        if (!created) throw new Error('create_failed');
      }
      closeForm();
    } catch (e) {
      setErr(isRTL ? 'הפעולה נכשלה. ייתכן שכבר קיים תיק בשם זה.' : 'Operation failed. A portfolio with this name may already exist.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Portfolio) => {
    if (portfolios.length <= 1) {
      setErr(isRTL ? 'אי אפשר למחוק את התיק האחרון' : 'Cannot delete the only portfolio');
      return;
    }
    const confirmMsg = isRTL
      ? `למחוק את "${p.name}"? כל הטריידים שבתיק זה יימחקו לצמיתות. פעולה זו אינה הפיכה.`
      : `Delete "${p.name}"? All trades in this portfolio will be permanently deleted. This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    const ok = await deletePortfolio(p.id);
    setBusy(false);
    if (!ok) setErr(isRTL ? 'המחיקה נכשלה' : 'Delete failed');
  };

  const triggerLabel = useMemo(() => {
    if (loading) return isRTL ? 'טוען…' : 'Loading…';
    return activePortfolio?.name ?? (isRTL ? 'בחר תיק' : 'Select portfolio');
  }, [loading, activePortfolio, isRTL]);

  return (
    <div ref={rootRef} style={{ position: 'relative', direction: isRTL ? 'rtl' : 'ltr' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={isRTL ? 'מעבר בין תיקים' : 'Switch portfolio'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '4px 10px' : '6px 12px',
          background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(15,23,42,0.4))',
          border: '1px solid rgba(34,211,238,0.25)',
          borderRadius: 8,
          color: '#e2e8f0',
          cursor: 'pointer',
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          maxWidth: 220, minWidth: 0,
          transition: 'all 0.18s ease',
        }}
      >
        {dot(activePortfolio?.color)}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)',
            [isRTL ? 'right' : 'left']: 0,
            minWidth: 280, maxWidth: 340,
            background: 'rgba(6,19,38,0.98)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(34,211,238,0.2)', borderRadius: 10,
            boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 24px rgba(34,211,238,0.12)',
            zIndex: 100, padding: 6, fontFamily: "'Poppins', sans-serif",
          } as React.CSSProperties}
        >
          {/* List */}
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '2px 2px 4px' }}>
            {portfolios.map((p) => {
              const isActive = p.id === activePortfolioId;
              return (
                <div
                  key={p.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { setActivePortfolioId(p.id); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                    background: isActive ? 'rgba(34,211,238,0.10)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(34,211,238,0.35)' : 'transparent'}`,
                    transition: 'background 0.15s',
                    marginBottom: 2,
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(148,163,184,0.06)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {dot(p.color)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {p.is_default && (
                        <span style={{ marginInlineStart: 6, fontSize: 9, padding: '1px 5px', background: 'rgba(52,211,153,0.15)', color: '#34d399', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
                          {isRTL ? 'ברירת מחדל' : 'DEFAULT'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {p.currency} · {isRTL ? 'הון התחלתי' : 'Start'} {Number(p.starting_balance).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {!p.is_default && (
                      <button
                        onClick={(e) => { e.stopPropagation(); void setDefault(p.id); }}
                        title={isRTL ? 'הפוך לברירת מחדל' : 'Set as default'}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, fontSize: 11 }}
                      >★</button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(p); setCreating(false); }}
                      title={isRTL ? 'ערוך' : 'Edit'}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleDelete(p); }}
                      title={isRTL ? 'מחק' : 'Delete'}
                      disabled={portfolios.length <= 1}
                      style={{ background: 'none', border: 'none', color: portfolios.length <= 1 ? '#334155' : '#f87171', cursor: portfolios.length <= 1 ? 'not-allowed' : 'pointer', padding: 2 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create / Edit form */}
          {(creating || editing) ? (
            <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', padding: '10px 6px 6px', display: 'grid', gap: 8 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? 'שם התיק' : 'Portfolio name'}
                autoFocus
                style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: '#f1f5f9', padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: '#f1f5f9', padding: '6px 8px', fontSize: 12, fontFamily: 'inherit' }}
                >
                  <option value="USD">USD</option>
                  <option value="ILS">ILS</option>
                  <option value="USDT">USDT</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  value={starting}
                  onChange={(e) => setStarting(e.target.value)}
                  inputMode="decimal"
                  placeholder={isRTL ? 'הון התחלתי' : 'Starting balance'}
                  style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: '#f1f5f9', padding: '6px 10px', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #f1f5f9' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
                  />
                ))}
              </div>
              {err && <div style={{ fontSize: 11, color: '#f87171' }}>{err}</div>}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={closeForm}
                  disabled={busy}
                  style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.25)', color: '#94a3b8', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >{isRTL ? 'ביטול' : 'Cancel'}</button>
                <button
                  onClick={handleSubmit}
                  disabled={busy}
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #14b8a6)', border: 'none', color: '#061326', padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >{busy ? '…' : (editing ? (isRTL ? 'שמור' : 'Save') : (isRTL ? 'צור' : 'Create'))}</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setCreating(true); setEditing(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'rgba(34,211,238,0.06)', border: '1px dashed rgba(34,211,238,0.35)',
                color: '#22d3ee', padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit', marginTop: 4,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              {isRTL ? 'תיק חדש' : 'New portfolio'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
