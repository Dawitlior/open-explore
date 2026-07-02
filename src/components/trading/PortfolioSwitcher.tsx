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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import type { Portfolio } from '@/hooks/use-portfolios';
import { orcaConfirm } from '@/lib/orca-confirm';

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
    resetPortfolio,
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vw = window.innerWidth;
      const isPhone = vw < 480;
      const width = isPhone ? Math.min(vw - 16, 380) : 300;
      let top: number;
      let left: number;
      if (isPhone) {
        // Bottom-sheet style on phones: pin to bottom of viewport, centered horizontally.
        left = (vw - width) / 2;
        top = Math.max(rect.bottom + 6, window.innerHeight - 520);
      } else {
        left = isRTL ? rect.right - width : rect.left;
        left = Math.max(8, Math.min(left, vw - width - 8));
        top = rect.bottom + 6;
      }
      setMenuPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, isRTL]);

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
    const ok = await orcaConfirm({
      isRTL,
      tone: 'danger',
      title: isRTL ? `למחוק את "${p.name}"?` : `Delete "${p.name}"?`,
      description: isRTL
        ? 'כל הטריידים שבתיק זה יימחקו לצמיתות. פעולה זו אינה הפיכה.'
        : 'All trades in this portfolio will be permanently deleted. This cannot be undone.',
      confirmLabel: isRTL ? 'מחק תיק' : 'Delete portfolio',
    });
    if (!ok) return;
    setBusy(true);
    const success = await deletePortfolio(p.id);
    setBusy(false);
    if (!success) setErr(isRTL ? 'המחיקה נכשלה' : 'Delete failed');
  };

  const handleReset = async (p: Portfolio) => {
    const ok = await orcaConfirm({
      isRTL,
      tone: 'danger',
      title: isRTL ? `לאפס את "${p.name}"?` : `Reset "${p.name}"?`,
      description: isRTL
        ? 'רק העסקאות בתיק הזה יימחקו לצמיתות. תיקים אחרים לא ייפגעו.'
        : 'Only trades in this portfolio will be permanently deleted. Other portfolios stay untouched.',
      confirmLabel: isRTL ? 'אפס תיק' : 'Reset portfolio',
    });
    if (!ok) return;
    setBusy(true);
    const success = await resetPortfolio(p.id);
    setBusy(false);
    if (!success) setErr(isRTL ? 'איפוס התיק נכשל' : 'Portfolio reset failed');
  };

  const triggerLabel = useMemo(() => {
    if (loading) return isRTL ? 'טוען…' : 'Loading…';
    return activePortfolio?.name ?? (isRTL ? 'בחר תיק' : 'Select portfolio');
  }, [loading, activePortfolio, isRTL]);

  return (
    <div ref={rootRef} style={{ position: 'relative', direction: isRTL ? 'rtl' : 'ltr' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={isRTL ? 'מעבר בין תיקים' : 'Switch portfolio'}
        className="ohb-ghost"
        style={{
          maxWidth: 240,
          minWidth: 0,
          height: 34,
          padding: '0 11px',
          gap: 8,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        {dot(activePortfolio?.color)}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: isRTL ? 'right' : 'left', color: 'hsl(var(--foreground))' }}>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', flexShrink: 0, opacity: 0.7 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>


      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left,
            width: typeof window !== 'undefined' && window.innerWidth < 480 ? Math.min(window.innerWidth - 16, 380) : undefined,
            minWidth: 300, maxWidth: 380,
            maxHeight: 'min(80vh, 580px)', overflowY: 'auto',
            background: 'hsl(var(--trading-bg-secondary) / 0.94)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: '1px solid hsl(var(--border))',
            borderRadius: 14,
            boxShadow: '0 0 0 1px hsl(var(--border)), 0 20px 48px -18px rgb(0 0 0 / 0.7), 0 8px 24px -14px rgb(0 0 0 / 0.5)',
            zIndex: 10000,
            padding: 10,
            fontFamily: "'Inter', system-ui, sans-serif",
            direction: isRTL ? 'rtl' : 'ltr',
            color: 'hsl(var(--foreground))',
          } as React.CSSProperties}
        >
          {/* Header — mirrors navbar's ohb-title / ohb-ghost language */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 6px 10px', marginBottom: 6,
            borderBottom: '1px solid hsl(var(--border))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {isRTL ? 'תיקי מסחר' : 'Portfolios'}
                </span>
                <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.3 }}>
                  {isRTL ? 'בחר או נהל תיק' : 'Switch or manage'}
                </span>
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'hsl(var(--trading-bg-surface) / 0.6)',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em',
            }}>
              {portfolios.length}/{tierMax}
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: 'auto', padding: '2px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {portfolios.map((p) => {
              const isActive = p.id === activePortfolioId;
              const locked = isPortfolioLocked(p.id);
              return (
                <div
                  key={p.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { setActivePortfolioId(p.id); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                    background: isActive ? 'hsl(var(--trading-cyan) / 0.09)' : 'hsl(var(--trading-bg-surface) / 0.35)',
                    border: `1px solid ${isActive ? 'hsl(var(--trading-cyan) / 0.35)' : 'hsl(var(--border))'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                    opacity: locked ? 0.72 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'hsl(var(--trading-bg-surface) / 0.7)'; e.currentTarget.style.borderColor = 'hsl(var(--trading-cyan) / 0.25)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'hsl(var(--trading-bg-surface) / 0.35)'; e.currentTarget.style.borderColor = 'hsl(var(--border))'; } }}
                >
                  {dot(p.color)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      {p.is_default && (
                        <span style={{ fontSize: 9, padding: '1px 5px', background: 'hsl(var(--trading-green) / 0.15)', color: 'hsl(var(--trading-green))', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>
                          {isRTL ? 'ברירת מחדל' : 'DEFAULT'}
                        </span>
                      )}
                      {locked && (
                        <span
                          title={isRTL ? 'תיק במצב קריאה־בלבד' : 'Read-only — upgrade to unlock'}
                          style={{ fontSize: 9, padding: '1px 5px', background: 'hsl(var(--trading-orange) / 0.15)', color: 'hsl(var(--trading-orange))', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4, display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          {isRTL ? 'נעול' : 'LOCKED'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {p.currency} · {isRTL ? 'הון' : 'Start'} {Number(p.starting_balance).toLocaleString()}
                    </div>
                  </div>
                  <div dir="ltr" style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center', direction: 'ltr', unicodeBidi: 'isolate' }}>
                    {!p.is_default && !locked && (
                      <IconBtn
                        onClick={(e) => { e.stopPropagation(); void setDefault(p.id); }}
                        title={isRTL ? 'הפוך לברירת מחדל' : 'Set as default'}
                        tone="star"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </IconBtn>
                    )}
                    <IconBtn
                      onClick={(e) => { e.stopPropagation(); if (locked) return; setEditing(p); setCreating(false); }}
                      title={locked ? (isRTL ? 'נעול' : 'Locked') : (isRTL ? 'ערוך' : 'Edit')}
                      disabled={locked}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </IconBtn>
                    <IconBtn
                      onClick={(e) => { e.stopPropagation(); if (locked) return; void handleReset(p); }}
                      title={locked ? (isRTL ? 'נעול' : 'Locked') : (isRTL ? 'אפס תיק' : 'Reset')}
                      disabled={locked || busy}
                      tone="warn"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </IconBtn>
                    <IconBtn
                      onClick={(e) => { e.stopPropagation(); if (locked) return; void handleDelete(p); }}
                      title={locked ? (isRTL ? 'נעול' : 'Locked') : (isRTL ? 'מחק' : 'Delete')}
                      disabled={portfolios.length <= 1 || locked}
                      tone="danger"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer status */}
          <div style={{ padding: '8px 6px 4px', fontSize: 10.5, color: 'hsl(var(--muted-foreground))', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid hsl(var(--border))', marginTop: 6 }}>
            <span>
              {portfolios.length} / {tierMax} · <span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{tier}</span>
            </span>
            {!canCreate && (
              <span style={{ color: 'hsl(var(--trading-orange))' }}>{isRTL ? 'הגעת למגבלה' : 'Limit reached'}</span>
            )}
          </div>

          {/* Create / Edit form */}
          {(creating || editing) ? (
            <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '12px 4px 4px', display: 'grid', gap: 8, marginTop: 4 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? 'שם התיק' : 'Portfolio name'}
                autoFocus
                style={{ background: 'hsl(var(--trading-bg-surface) / 0.6)', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', padding: '8px 10px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ background: 'hsl(var(--trading-bg-surface) / 0.6)', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', padding: '8px 8px', fontSize: 12.5, fontFamily: 'inherit' }}
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
                  style={{ background: 'hsl(var(--trading-bg-surface) / 0.6)', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', padding: '8px 10px', fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: color === c ? '2px solid hsl(var(--foreground))' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
                  />
                ))}
              </div>
              {err && <div style={{ fontSize: 11, color: 'hsl(var(--trading-red))' }}>{err}</div>}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={closeForm}
                  disabled={busy}
                  className="ohb-ghost"
                  style={{ height: 32, fontSize: 12 }}
                >{isRTL ? 'ביטול' : 'Cancel'}</button>
                <button
                  onClick={handleSubmit}
                  disabled={busy}
                  className="ohb-primary"
                  style={{ height: 32, fontSize: 12 }}
                >{busy ? '…' : (editing ? (isRTL ? 'שמור' : 'Save') : (isRTL ? 'צור' : 'Create'))}</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { if (!canCreate) return; setCreating(true); setEditing(null); }}
              disabled={!canCreate}
              title={!canCreate ? (isRTL ? `הגעת למגבלת המסלול (${tierMax})` : `Plan limit reached (${tierMax})`) : undefined}
              className="ohb-ghost"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                marginTop: 8, height: 36,
                borderStyle: 'dashed',
                color: canCreate ? 'hsl(var(--trading-cyan))' : 'hsl(var(--muted-foreground))',
                cursor: canCreate ? 'pointer' : 'not-allowed',
                fontSize: 12.5, fontWeight: 600,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {canCreate ? <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></> : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}
              </svg>
              {canCreate
                ? (isRTL ? 'תיק חדש' : 'New portfolio')
                : (isRTL ? `הגעת למגבלה (${tierMax})` : `Limit reached (${tierMax})`)}
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Compact icon button matching the navbar's ohb-ghost language. */
function IconBtn({
  children, onClick, title, disabled, tone,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  disabled?: boolean;
  tone?: 'star' | 'warn' | 'danger';
}) {
  const toneColor =
    tone === 'star' ? 'hsl(var(--trading-orange))' :
    tone === 'warn' ? 'hsl(var(--trading-orange))' :
    tone === 'danger' ? 'hsl(var(--trading-red))' :
    'hsl(var(--muted-foreground))';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, padding: 0, borderRadius: 7,
        background: 'hsl(var(--trading-bg-surface) / 0.5)',
        border: '1px solid hsl(var(--border))',
        color: disabled ? 'hsl(var(--muted-foreground) / 0.4)' : toneColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'hsl(var(--trading-bg-surface))';
        e.currentTarget.style.borderColor = toneColor;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'hsl(var(--trading-bg-surface) / 0.5)';
        e.currentTarget.style.borderColor = 'hsl(var(--border))';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}
