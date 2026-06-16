import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accessibility, Plus, Minus, Contrast, Link2, PauseCircle, Droplet,
  Type, RotateCcw, X, Eye,
} from 'lucide-react';

/**
 * AccessibilityWidget — global floating a11y panel.
 * Persisted to localStorage. Mounted once via OrcaUXLayer.
 *
 *  - Font size scale (90%–160%)
 *  - High contrast
 *  - Grayscale
 *  - Highlight links
 *  - Pause animations
 *  - Larger cursor
 *  - Readable font (override to a clean sans serif)
 */

const STORAGE_KEY = 'orca:a11y:v1';

type A11yState = {
  fontScale: number;       // 1 = 100%
  highContrast: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
  pauseAnim: boolean;
  bigCursor: boolean;
  readableFont: boolean;
};

const DEFAULTS: A11yState = {
  fontScale: 1,
  highContrast: false,
  grayscale: false,
  highlightLinks: false,
  pauseAnim: false,
  bigCursor: false,
  readableFont: false,
};

function loadState(): A11yState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

function detectLang(): 'he' | 'en' {
  try {
    if (typeof document !== 'undefined' && document.documentElement.lang === 'en') return 'en';
  } catch {}
  return 'he';
}

export const AccessibilityWidget = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(() =>
    typeof window === 'undefined' ? { ...DEFAULTS } : loadState()
  );
  const lang = detectLang();
  const t = (he: string, en: string) => (lang === 'he' ? he : en);

  /* Apply to <html> */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--a11y-font-scale', String(state.fontScale));
    root.classList.toggle('a11y-high-contrast', state.highContrast);
    root.classList.toggle('a11y-grayscale', state.grayscale);
    root.classList.toggle('a11y-highlight-links', state.highlightLinks);
    root.classList.toggle('a11y-pause-anim', state.pauseAnim);
    root.classList.toggle('a11y-big-cursor', state.bigCursor);
    root.classList.toggle('a11y-readable-font', state.readableFont);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  /* Alt+9 toggles the panel (universal a11y shortcut) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '9') { e.preventDefault(); setOpen(s => !s); }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const update = useCallback((patch: Partial<A11yState>) =>
    setState(s => ({ ...s, ...patch })), []);

  const reset = useCallback(() => setState({ ...DEFAULTS }), []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (state.fontScale !== 1) n++;
    (['highContrast','grayscale','highlightLinks','pauseAnim','bigCursor','readableFont'] as const)
      .forEach(k => { if (state[k]) n++; });
    return n;
  }, [state]);

  // Position: bottom-start in RTL (he) = bottom-right; in LTR = bottom-left.
  // Keep it on the side opposite to the back-to-top button (which is bottom-right).
  const side = lang === 'he' ? 'left-5' : 'left-5';

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={t('פתח תפריט נגישות', 'Open accessibility menu')}
        aria-expanded={open}
        aria-haspopup="dialog"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`fixed bottom-5 ${side} z-[9993] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg`}
        style={{
          background: 'linear-gradient(135deg, hsl(210 100% 50%) 0%, hsl(258 90% 56%) 100%)',
          boxShadow: '0 6px 24px hsl(210 100% 50% / 0.45), 0 0 0 1px hsl(0 0% 100% / 0.12) inset',
        }}
      >
        <Accessibility size={22} strokeWidth={2.2} />
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: 'hsl(38 95% 55%)', color: '#1a1300' }}
          >
            {activeCount}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9994] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t('תפריט נגישות', 'Accessibility menu')}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              dir={lang === 'he' ? 'rtl' : 'ltr'}
              className={`fixed bottom-20 ${side} z-[9995] w-[min(92vw,340px)] rounded-2xl p-4 orca-glass orca-grain text-foreground`}
              style={{
                background: 'hsl(220 30% 8% / 0.92)',
                border: '1px solid hsl(0 0% 100% / 0.1)',
                boxShadow: '0 20px 60px hsl(0 0% 0% / 0.5)',
              }}
            >
              <header className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Accessibility size={18} className="text-primary" />
                  <h2 className="text-sm font-bold tracking-wide uppercase">
                    {t('נגישות', 'Accessibility')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('סגור', 'Close')}
                  className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </header>

              {/* Font size */}
              <section className="mb-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Type size={12} /> {t('גודל טקסט', 'Text size')}
                  <span className="ms-auto font-mono text-foreground/80">
                    {Math.round(state.fontScale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update({ fontScale: Math.max(0.9, +(state.fontScale - 0.1).toFixed(2)) })}
                    aria-label={t('הקטן טקסט', 'Decrease text')}
                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ fontScale: 1 })}
                    className="px-3 h-9 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ fontScale: Math.min(1.6, +(state.fontScale + 0.1).toFixed(2)) })}
                    aria-label={t('הגדל טקסט', 'Increase text')}
                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </section>

              {/* Toggles */}
              <section className="grid grid-cols-2 gap-2 mb-3">
                <ToggleTile
                  icon={<Contrast size={16} />}
                  label={t('ניגודיות גבוהה', 'High contrast')}
                  active={state.highContrast}
                  onClick={() => update({ highContrast: !state.highContrast })}
                />
                <ToggleTile
                  icon={<Droplet size={16} />}
                  label={t('גווני אפור', 'Grayscale')}
                  active={state.grayscale}
                  onClick={() => update({ grayscale: !state.grayscale })}
                />
                <ToggleTile
                  icon={<Link2 size={16} />}
                  label={t('הדגש קישורים', 'Highlight links')}
                  active={state.highlightLinks}
                  onClick={() => update({ highlightLinks: !state.highlightLinks })}
                />
                <ToggleTile
                  icon={<PauseCircle size={16} />}
                  label={t('עצור אנימציות', 'Pause animations')}
                  active={state.pauseAnim}
                  onClick={() => update({ pauseAnim: !state.pauseAnim })}
                />
                <ToggleTile
                  icon={<Eye size={16} />}
                  label={t('סמן גדול', 'Large cursor')}
                  active={state.bigCursor}
                  onClick={() => update({ bigCursor: !state.bigCursor })}
                />
                <ToggleTile
                  icon={<Type size={16} />}
                  label={t('פונט קריא', 'Readable font')}
                  active={state.readableFont}
                  onClick={() => update({ readableFont: !state.readableFont })}
                />
              </section>

              <button
                type="button"
                onClick={reset}
                className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw size={13} />
                {t('איפוס הגדרות נגישות', 'Reset accessibility settings')}
              </button>

              <p className="mt-3 text-[10px] text-muted-foreground text-center">
                {t('קיצור: Alt + 9', 'Shortcut: Alt + 9')}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const ToggleTile = ({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="h-16 rounded-lg border text-[11px] leading-tight flex flex-col items-center justify-center gap-1 px-2 text-center transition-colors"
    style={{
      background: active ? 'hsl(210 100% 50% / 0.18)' : 'hsl(0 0% 100% / 0.04)',
      borderColor: active ? 'hsl(210 100% 60% / 0.55)' : 'hsl(0 0% 100% / 0.1)',
      color: active ? 'hsl(210 100% 80%)' : 'hsl(0 0% 88%)',
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default AccessibilityWidget;
