/**
 * A11yPanel — the native ORCA accessibility preferences panel.
 *
 * Implemented on top of Radix Dialog (focus trap, ESC handling,
 * `aria-modal`, return-focus to trigger — all free). Rendered as a
 * compact chat-window-style overlay anchored to the inline-end edge,
 * NOT a full-height Sheet, per the Phase 1 spec.
 *
 * NO cosmetic-filter overlays — every control writes real CSS state.
 */
import { useEffect, useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Accessibility, X, Type, Contrast, Eye, MousePointer2, Sparkles, Link as LinkIcon, ALargeSmall, RotateCcw, AlignHorizontalJustifyCenter } from 'lucide-react';
import { ReadingGuide } from './ReadingGuide';
import { useA11yPrefs, type A11yContrast } from '@/hooks/use-a11y-prefs';
import { useLang } from '@/hooks/use-lang';

export function A11yPanel() {
  const { isRTL, t } = useLang();
  const { prefs, update, reset, incScale, decScale } = useA11yPrefs();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  // Alt+A shortcut (does not interfere with screen-reader nav keys).
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

  const scalePct = Math.round(prefs.scale * 100);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <ReadingGuide />
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
              <div data-a11y-row="guide">
                <ToggleRow icon={<AlignHorizontalJustifyCenter size={18} aria-hidden="true" />} title={t('מדריך קריאה', 'Reading guide')} hint={t('פס אופקי שעוקב אחרי הסמן', 'Horizontal bar that follows the cursor')} pressed={prefs.guide} onToggle={() => update({ guide: !prefs.guide })} />
              </div>
            </Section>

            <button
              type="button"
              onClick={reset}
              style={{ width: '100%', marginTop: 8, padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px solid #2A3550', color: '#cdd4e3', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600 }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t('אפס הגדרות נגישות', 'Reset accessibility settings')}
            </button>
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
