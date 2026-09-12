/**
 * CookiePreferencesModal — brand-styled per-category cookie controls. Essential
 * is locked on; analytics / functional / marketing are toggleable. Save / Accept
 * all / Reject all all persist through use-cookie-consent (cloud + cache + audit).
 * Presentation only; wrapped in .orca-marketing for the brand design anywhere.
 */
import { useEffect, useState } from 'react';
import { useCookieConsent, DEFAULT_CHOICES } from '@/hooks/use-cookie-consent';

type CatKey = 'analytics' | 'functional' | 'marketing';
const CATEGORIES: { key: CatKey; title: string; desc: string }[] = [
  { key: 'analytics', title: 'Analytics', desc: 'Anonymous usage statistics so we can find rough edges and improve Orca.' },
  { key: 'functional', title: 'Functional', desc: 'Remembers preferences like language, theme, and layout between visits.' },
  { key: 'marketing', title: 'Marketing', desc: 'Measures campaign relevance. We never sell your data or trades.' },
];

function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-indigo' : 'bg-canvas-deep'} ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function CookiePreferencesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { consent, save, acceptAll, rejectAll } = useCookieConsent();
  const base = consent ?? DEFAULT_CHOICES;
  const [choices, setChoices] = useState({ analytics: base.analytics, functional: base.functional, marketing: base.marketing });

  useEffect(() => {
    if (open) setChoices({ analytics: base.analytics, functional: base.functional, marketing: base.marketing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const saveAndClose = async () => { await save({ essential: true, ...choices }); onClose(); };
  const acceptAllAndClose = async () => { await acceptAll(); onClose(); };
  const rejectAllAndClose = async () => { await rejectAll(); onClose(); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,22,0.45)', backdropFilter: 'blur(4px)' }} />
      <div className="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface" style={{ maxHeight: 'calc(100vh - 32px)', boxShadow: '0 4px 10px rgb(17 19 24 / 0.06), 0 30px 64px -26px rgb(17 19 24 / 0.3)' }}>
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <h2 className="font-display text-[20px] font-bold text-ink">Cookie preferences</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-mute">Choose what Orca may use. You can change this anytime.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-canvas-deep hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-6">
          {/* Essential — locked */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3.5">
            <div>
              <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                Essential
                <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo">Always on</span>
              </span>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">Required for sign-in, security, and core features.</p>
            </div>
            <Toggle on disabled label="Essential (always on)" />
          </div>

          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3.5">
              <div>
                <span className="text-[14.5px] font-semibold text-ink">{c.title}</span>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{c.desc}</p>
              </div>
              <Toggle
                on={choices[c.key]}
                label={c.title}
                onChange={(v) => setChoices((s) => ({ ...s, [c.key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-line p-6 sm:flex-row sm:items-center sm:justify-between [&_button]:min-h-[44px]">
          <button onClick={() => void rejectAllAndClose()} className="rounded-xl px-4 text-[13.5px] font-semibold text-ink-mute transition-colors hover:text-ink">
            Reject all
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => void saveAndClose()} className="rounded-xl border border-line bg-surface px-5 text-[13.5px] font-semibold text-ink transition-colors hover:border-indigo/45">
              Save choices
            </button>
            <button onClick={() => void acceptAllAndClose()} className="rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5">
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookiePreferencesModal;
