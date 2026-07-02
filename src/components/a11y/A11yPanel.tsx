/**
 * A11yPanel — ORCA accessibility preferences panel.
 * Radix Dialog for focus/ESC handling. Portaled to <body>, so it is
 * NEVER inside the filtered #root subtree.
 */
import { useEffect, useId, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link as RouterLink } from 'react-router-dom';
import { Accessibility, X, Type, Contrast, Eye, MousePointer2, Sparkles, Link as LinkIcon, ALargeSmall, RotateCcw } from 'lucide-react';
import { useA11yPrefs, type A11yContrast } from '@/hooks/use-a11y-prefs';
import { useLang } from '@/hooks/use-lang';

const FAB_SIZE = 56;
const FAB_MARGIN = 12;
const FAB_POS_KEY = 'orca:a11y:fabPos';
const FAB_DOCK_KEY = 'orca:a11y:fabDock';
const DOCK_EDGE_THRESHOLD = 32;
const AUTO_DOCK_MS = 4000;

type DockState = { docked: boolean; side: 'left' | 'right'; y: number };

function isTouchDevice(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function A11yPanel() {
  const { isRTL, t } = useLang();
  const { prefs, update, reset, incScale, decScale } = useA11yPrefs();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  // Alt+A shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- Draggable FAB (touch only) ----
  const [isTouch] = useState<boolean>(() => isTouchDevice());
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dock, setDock] = useState<DockState | null>(null);
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0, vx: 0, lx: 0, lt: 0 });
  const autoDockTimer = useRef<number | null>(null);

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.min(Math.max(FAB_MARGIN, x), window.innerWidth - FAB_SIZE - FAB_MARGIN),
    y: Math.min(Math.max(FAB_MARGIN, y), window.innerHeight - FAB_SIZE - FAB_MARGIN),
  }), []);

  const clampY = useCallback((y: number) =>
    Math.min(Math.max(FAB_MARGIN, y), window.innerHeight - FAB_SIZE - FAB_MARGIN),
  []);

  // Load persisted position + dock state
  useEffect(() => {
    if (!isTouch) return;
    try {
      const d = localStorage.getItem(FAB_DOCK_KEY);
      if (d) {
        const s = JSON.parse(d) as DockState;
        if (s && (s.side === 'left' || s.side === 'right') && typeof s.y === 'number') {
          setDock({ ...s, y: clampY(s.y) });
        }
      }
      const p = localStorage.getItem(FAB_POS_KEY);
      if (p) {
        const pp = JSON.parse(p);
        if (typeof pp?.x === 'number' && typeof pp?.y === 'number') setPos(clamp(pp.x, pp.y));
      }
    } catch { /* noop */ }
  }, [isTouch, clamp, clampY]);

  // Reclamp on resize/orientation
  useEffect(() => {
    if (!isTouch) return;
    const h = () => {
      setPos(p => p ? clamp(p.x, p.y) : p);
      setDock(d => d ? { ...d, y: clampY(d.y) } : d);
    };
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', h);
    return () => {
      window.removeEventListener('resize', h);
      window.removeEventListener('orientationchange', h);
    };
  }, [isTouch, clamp, clampY]);

  const persistDock = useCallback((d: DockState | null) => {
    try {
      if (d) localStorage.setItem(FAB_DOCK_KEY, JSON.stringify(d));
      else localStorage.removeItem(FAB_DOCK_KEY);
    } catch { /* noop */ }
  }, []);

  const clearAutoDock = useCallback(() => {
    if (autoDockTimer.current) { window.clearTimeout(autoDockTimer.current); autoDockTimer.current = null; }
  }, []);

  const dockToSide = useCallback((side: 'left' | 'right', y: number) => {
    const next: DockState = { docked: true, side, y: clampY(y) };
    setDock(next);
    persistDock(next);
    clearAutoDock();
  }, [clampY, persistDock, clearAutoDock]);

  const undock = useCallback(() => {
    setDock(prev => {
      if (!prev) return prev;
      // Re-expand slightly inward from the edge, same y
      const x = prev.side === 'right'
        ? window.innerWidth - FAB_SIZE - FAB_MARGIN
        : FAB_MARGIN;
      const y = clampY(prev.y);
      setPos({ x, y });
      const next: DockState = { ...prev, docked: false };
      persistDock(next);
      return next;
    });
    scheduleAutoDock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampY, persistDock]);

  const scheduleAutoDock = useCallback(() => {
    clearAutoDock();
    autoDockTimer.current = window.setTimeout(() => {
      setPos(p => {
        if (!p) return p;
        const nearRight = p.x >= window.innerWidth - FAB_SIZE - DOCK_EDGE_THRESHOLD - FAB_MARGIN;
        const nearLeft = p.x <= DOCK_EDGE_THRESHOLD + FAB_MARGIN;
        if (nearRight) dockToSide('right', p.y);
        else if (nearLeft) dockToSide('left', p.y);
        return p;
      });
    }, AUTO_DOCK_MS);
  }, [clearAutoDock, dockToSide]);

  useEffect(() => () => clearAutoDock(), [clearAutoDock]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isTouch) return;
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, vx: 0, lx: e.clientX, lt: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    clearAutoDock();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.hypot(dx, dy) > 8) d.moved = true;
    if (d.moved) {
      // If we were docked, moving = undock into a live position
      if (dock?.docked) {
        setDock(prev => prev ? { ...prev, docked: false } : prev);
      }
      const now = performance.now();
      const dt = Math.max(1, now - d.lt);
      d.vx = (e.clientX - d.lx) / dt; // px/ms
      d.lx = e.clientX; d.lt = now;
      setPos(clamp(d.ox + dx, d.oy + dy));
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }

    if (!d.moved) {
      // Tap
      if (dock?.docked) {
        undock(); // expand only, do NOT open
      } else {
        setOpen(true);
        clearAutoDock();
      }
      return;
    }

    // Drag release — decide dock vs free
    setPos(prev => {
      if (!prev) return prev;
      const halfway = window.innerWidth / 2;
      const outwardRight = d.vx > 0.6; // px/ms fling
      const outwardLeft = d.vx < -0.6;
      const nearRightEdge = prev.x >= window.innerWidth - FAB_SIZE - DOCK_EDGE_THRESHOLD - FAB_MARGIN;
      const nearLeftEdge = prev.x <= DOCK_EDGE_THRESHOLD + FAB_MARGIN;
      const pastHalfRight = prev.x + FAB_SIZE / 2 > halfway && outwardRight;
      const pastHalfLeft = prev.x + FAB_SIZE / 2 < halfway && outwardLeft;

      if (nearRightEdge || pastHalfRight) {
        dockToSide('right', prev.y);
        return prev;
      }
      if (nearLeftEdge || pastHalfLeft) {
        dockToSide('left', prev.y);
        return prev;
      }
      try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(prev)); } catch { /* noop */ }
      scheduleAutoDock();
      return prev;
    });
  };

  // Compute FAB style
  const isDocked = !!dock?.docked;
  const fabStyle: React.CSSProperties | undefined = isTouch
    ? (isDocked
        ? {
            position: 'fixed',
            top: dock!.y,
            left: dock!.side === 'left' ? 0 : 'auto',
            right: dock!.side === 'right' ? 0 : 'auto',
            insetBlockEnd: 'auto', insetInlineEnd: 'auto',
            width: 28, height: 56,
            borderRadius: dock!.side === 'right' ? '28px 0 0 28px' : '0 28px 28px 0',
            touchAction: 'none',
            opacity: 0.9,
          }
        : (pos
            ? {
                position: 'fixed', left: pos.x, top: pos.y,
                insetInlineEnd: 'auto', insetBlockEnd: 'auto',
                touchAction: 'none',
              }
            : undefined))
    : undefined;

  const fabAriaLabel = isDocked
    ? t('הצג כפתור נגישות', 'Show accessibility button')
    : t('פתח פאנל נגישות', 'Open accessibility panel');

  const scalePct = Math.round(prefs.scale * 100);

  const dockedChevron = isDocked ? (
    <span aria-hidden="true" style={{
      display: 'inline-block',
      width: 0, height: 0,
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      [dock!.side === 'right' ? 'borderRight' : 'borderLeft']: '8px solid #06121b',
    } as React.CSSProperties} />
  ) : null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {isTouch ? (
        <button
          type="button"
          className={`orca-a11y-fab${isDocked ? ' orca-a11y-fab--docked' : ''}`}
          aria-label={fabAriaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          style={fabStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {isDocked ? dockedChevron : <Accessibility aria-hidden="true" />}
        </button>
      ) : (
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="orca-a11y-fab"
            aria-label={t('פתח פאנל נגישות', 'Open accessibility panel')}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Accessibility aria-hidden="true" />
          </button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(3,5,11,.55)', backdropFilter: 'blur(3px)',
          }}
        />
        <Dialog.Content
          aria-labelledby={titleId}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="a11y-popup"
          style={{
            position: 'fixed', zIndex: 95,
            insetBlockEnd: 'clamp(16px, 4vh, 96px)',
            insetInlineEnd: 'clamp(16px, 3vw, 32px)',
            width: 'min(380px, calc(100vw - 32px))',
            maxHeight: 'min(720px, calc(100vh - 32px))',
            background: 'linear-gradient(180deg,#0C111E,#080C16)',
            border: '1px solid #1E2740',
            borderRadius: 18,
            boxShadow: '0 30px 80px -20px rgba(0,0,0,.9)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Heebo', system-ui, sans-serif",
            color: '#E8ECF4',
          }}
        >
          <span className="a11y-popup-handle" aria-hidden="true" />
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #1A2236' }}>
            <Dialog.Title id={titleId} style={{ fontSize: 17, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <Accessibility size={22} color="#E5B94E" aria-hidden="true" />
              {t('נגישות', 'Accessibility')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('סגור', 'Close')}
                style={{ width: 36, height: 36, borderRadius: 10, background: '#121A2C', border: '1px solid #232d45', color: '#cdd4e3', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          <Dialog.Description asChild>
            <p style={{ fontSize: 12, color: '#8A93A8', padding: '12px 20px 0', margin: 0, lineHeight: 1.6 }}>
              {t(
                'הגדרות אלו נשמרות במכשיר זה בלבד. אנו לא טוענים תאימות מלאה — זוהי שכבת התאמות שמלווה את התשתית הנגישה של ORCA.',
                'These settings are saved on this device only. We do not claim full compliance — this is a preferences layer on top of ORCA\'s accessible foundation.',
              )}
            </p>
          </Dialog.Description>

          <div style={{ overflowY: 'auto', padding: '14px 20px 18px', flex: 1 }}>

            {/* Text size */}
            <Section label={t('גודל טקסט', 'Text size')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SizeBtn onClick={decScale} disabled={prefs.scale <= 1} ariaLabel={t('הקטן טקסט', 'Decrease text size')}>
                  <ALargeSmall size={18} aria-hidden="true" />
                </SizeBtn>
                <div style={{ flex: 1, textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: '#fff' }} aria-live="polite">
                  {scalePct}%
                  <small style={{ display: 'block', fontSize: 10, color: '#8A93A8', fontWeight: 500, letterSpacing: '.06em' }}>
                    {t('100% — 200%', '100% — 200%')}
                  </small>
                </div>
                <SizeBtn onClick={incScale} disabled={prefs.scale >= 2} ariaLabel={t('הגדל טקסט', 'Increase text size')}>
                  <Type size={18} aria-hidden="true" />
                </SizeBtn>
              </div>
            </Section>

            {/* Contrast */}
            <Section label={t('ניגודיות', 'Contrast')}>
              <div role="radiogroup" aria-label={t('בחר ניגודיות', 'Choose contrast')} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['normal', 'high', 'inverted'] as A11yContrast[]).map(v => {
                  const labels = {
                    normal: t('רגיל', 'Normal'),
                    high: t('גבוהה', 'High'),
                    inverted: t('הפוכה', 'Inverted'),
                  } as const;
                  const pressed = prefs.contrast === v;
                  return (
                    <button
                      key={v}
                      role="radio"
                      aria-checked={pressed}
                      onClick={() => update({ contrast: v })}
                      className="a11y-seg-btn"
                      style={segBtn(pressed)}
                    >
                      {labels[v]}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Visual aids */}
            <Section label={t('עזרים חזותיים', 'Visual aids')}>
              <ToggleRow icon={<Contrast size={18} aria-hidden="true" />} title={t('גווני אפור', 'Grayscale')} hint={t('הסר צבע מהדף', 'Remove color from the page')} pressed={prefs.grayscale} onToggle={() => update({ grayscale: !prefs.grayscale })} />
              <ToggleRow icon={<LinkIcon size={18} aria-hidden="true" />} title={t('הדגש קישורים', 'Highlight links')} hint={t('קישורים בקו תחתון + מתאר', 'Underline + outline on links')} pressed={prefs.links} onToggle={() => update({ links: !prefs.links })} />
              <ToggleRow icon={<Type size={18} aria-hidden="true" />} title={t('גופן קריא', 'Readable font')} hint={t('גופן ומרווחים קריאים יותר', 'Friendlier font + spacing')} pressed={prefs.readable} onToggle={() => update({ readable: !prefs.readable })} />
              <ToggleRow icon={<Sparkles size={18} aria-hidden="true" />} title={t('מרווחי טקסט', 'Text spacing')} hint={t('הגדל מרווח אותיות ושורה', 'Looser letter / line spacing')} pressed={prefs.spacing} onToggle={() => update({ spacing: !prefs.spacing })} />
            </Section>

            {/* Navigation aids */}
            <Section label={t('עזרי ניווט', 'Navigation aids')}>
              <ToggleRow icon={<MousePointer2 size={18} aria-hidden="true" />} title={t('סמן עכבר גדול', 'Large cursor')} hint={t('סמן בולט וקל לאיתור', 'High-visibility pointer')} pressed={prefs.cursor} onToggle={() => update({ cursor: !prefs.cursor })} />
              <ToggleRow icon={<Eye size={18} aria-hidden="true" />} title={t('מסגרת פוקוס מודגשת', 'Stronger focus ring')} hint={t('מתאר עבה כשמתמקדים בקלט', 'Thicker outline on focus')} pressed={prefs.focus} onToggle={() => update({ focus: !prefs.focus })} />
              <ToggleRow icon={<Sparkles size={18} aria-hidden="true" />} title={t('עצור אנימציות', 'Reduce motion')} hint={t('בטל מעברים ואנימציות', 'Disable transitions / animations')} pressed={prefs.motion} onToggle={() => update({ motion: !prefs.motion })} />
            </Section>

            <button
              type="button"
              onClick={reset}
              style={{ width: '100%', marginTop: 8, padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px solid #2A3550', color: '#cdd4e3', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600 }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t('אפס הגדרות נגישות', 'Reset accessibility settings')}
            </button>

            <footer style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1A2236', textAlign: 'center' }}>
              <RouterLink
                to="/accessibility"
                onClick={() => setOpen(false)}
                className="a11y-statement-link"
                style={{
                  fontSize: 13, fontWeight: 600, color: '#E5B94E',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  padding: '6px 10px', borderRadius: 8, display: 'inline-block',
                }}
              >
                {t('הצהרת נגישות', 'Accessibility statement')}
              </RouterLink>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#E5B94E', textTransform: 'uppercase', margin: '4px 0 10px' }}>{label}</h3>
      {children}
    </section>
  );
}

function SizeBtn({ children, onClick, disabled, ariaLabel }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ariaLabel: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className="a11y-size-btn" style={{
      flex: 1, height: 48, borderRadius: 12, background: '#101728', border: '1px solid #242e48',
      color: disabled ? '#4a546b' : '#E8ECF4', cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'grid', placeItems: 'center', fontWeight: 700, opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function segBtn(pressed: boolean): React.CSSProperties {
  return {
    height: 42, borderRadius: 11,
    background: pressed ? 'linear-gradient(135deg,#E5B94E,#D4AF37)' : '#101728',
    border: pressed ? '1px solid transparent' : '1px solid #242e48',
    color: pressed ? '#06121b' : '#cdd4e3',
    cursor: 'pointer', fontWeight: 600, fontSize: 13,
    fontFamily: "'Heebo', system-ui, sans-serif",
  };
}

function ToggleRow({ icon, title, hint, pressed, onToggle }: { icon: React.ReactNode; title: string; hint: string; pressed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className="a11y-toggle-row"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        width: '100%', background: '#0E1524', border: '1px solid #1d2740', borderRadius: 13,
        padding: '12px 14px', marginBottom: 8, cursor: 'pointer', color: '#E8ECF4',
        fontFamily: "'Heebo', system-ui, sans-serif", textAlign: 'start',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: '#121A2C', display: 'grid', placeItems: 'center', color: '#E5B94E', flex: 'none' }}>{icon}</span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <b style={{ fontSize: 14, fontWeight: 600 }}>{title}</b>
          <span style={{ fontSize: 11.5, color: '#7E879B', marginTop: 2 }}>{hint}</span>
        </span>
      </span>
      <span aria-hidden="true" style={{
        flex: 'none', width: 44, height: 25, borderRadius: 999,
        background: pressed ? 'linear-gradient(135deg,#E5B94E,#D4AF37)' : '#222c44',
        position: 'relative', transition: '.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, insetInlineStart: pressed ? 22 : 3,
          width: 19, height: 19, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,.4)', transition: '.2s',
        }} />
      </span>
    </button>
  );
}
