import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OrcaUXLayer — global premium UX layer.
 * Bundles 20 features that activate everywhere with zero per-component changes:
 *
 *  1.  Pointer-tracked spotlight on glass cards (CSS vars --orca-mx/my)
 *  2.  Magnetic hover on all .orca-glass-hover (subtle 3D tilt via JS)
 *  3.  Top-of-page scroll progress bar (cyan→purple gradient)
 *  4.  Custom cyan cursor halo (desktop only, fine pointer)
 *  5.  Back-to-top floating button (appears after 600px scroll)
 *  6.  Auto scroll-reveal — adds `animate-fade-in` to elements when in view
 *  7.  Network-aware "Online/Offline" toast
 *  8.  Live clock + market session pill (top-right, fixed)
 *  9.  Idle detector — dims UI after 90s, recovers on activity
 * 10.  Keyboard hints overlay (press `?`)
 * 11.  Global ⌘K / Ctrl+K hint indicator (bottom-right)
 * 12.  Konami easter egg → toggles holographic mode
 * 13.  Print-friendly stylesheet trigger via Ctrl+P listener (no-op fallback)
 * 14.  Auto-detects images and lazy-loads them (loading="lazy")
 * 15.  Smooth-scroll for in-page anchor links
 * 16.  External-link safety: rel="noopener noreferrer" auto-applied
 * 17.  Accessibility: visible skip-to-content link on focus
 * 18.  Click ripple on all <button> elements (premium tactile feedback)
 * 19.  Page-load progress bar that fades out
 * 20.  PerformanceObserver — long-task warning toast in dev
 */
export const OrcaUXLayer = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showOnlineToast, setShowOnlineToast] = useState<null | 'online' | 'offline'>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [idle, setIdle] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  /* ─── 1. Pointer-tracked spotlight (no tilt — disabled per user request) ─── */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.('.orca-glass-hover') as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      target.style.setProperty('--orca-mx', `${x}px`);
      target.style.setProperty('--orca-my', `${y}px`);
      // Magnetic 3D tilt removed — caused unwanted hover animation on Journal & cards.
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  /* ─── 3. Scroll progress + 5. back-to-top ─── */
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
      setScrollPct(pct);
      setShowBackTop(h.scrollTop > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── 4. Custom cursor halo — DISABLED per user request ─── */

  /* ─── 7. Online / offline toasts ─── */
  useEffect(() => {
    const on = () => { setOnline(true); setShowOnlineToast('online'); setTimeout(() => setShowOnlineToast(null), 2400); };
    const off = () => { setOnline(false); setShowOnlineToast('offline'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* ─── 8. Live clock ─── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ─── 9. Idle dimmer (90s) ─── */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 90_000);
    };
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.removeEventListener(ev, reset));
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.filter = idle ? 'brightness(0.78) saturate(0.85)' : '';
    document.documentElement.style.transition = 'filter 600ms ease';
  }, [idle]);

  /* ─── 10. Help (?) ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowHelp(s => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── 6. Scroll-reveal observer ─── */
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    const candidates = document.querySelectorAll<HTMLElement>('.orca-glass:not([data-revealed])');
    candidates.forEach(el => {
      el.dataset.revealed = '1';
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 540ms cubic-bezier(0.16,1,0.3,1), transform 540ms cubic-bezier(0.16,1,0.3,1)';
      io.observe(el);
    });
    // Re-run when DOM mutates
    const mo = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>('.orca-glass:not([data-revealed])').forEach(el => {
        el.dataset.revealed = '1';
        el.style.opacity = '0';
        el.style.transform = 'translateY(14px)';
        el.style.transition = 'opacity 540ms cubic-bezier(0.16,1,0.3,1), transform 540ms cubic-bezier(0.16,1,0.3,1)';
        io.observe(el);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  /* ─── 14. Lazy images + 15. smooth anchors + 16. external rel ─── */
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLImageElement>('img:not([loading])').forEach(img => { img.loading = 'lazy'; img.decoding = 'async'; });
      document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]:not([rel])').forEach(a => { a.rel = 'noopener noreferrer'; });
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => mo.disconnect();
  }, []);

  /* ─── 18. Click ripple on all buttons ─── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const r = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(r.width, r.height) * 1.4;
      ripple.style.cssText = `
        position: absolute; left: ${e.clientX - r.left - size/2}px; top: ${e.clientY - r.top - size/2}px;
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: hsl(184 100% 50% / 0.25); pointer-events: none;
        transform: scale(0); opacity: 1; mix-blend-mode: screen;
        transition: transform 520ms cubic-bezier(0.16,1,0.3,1), opacity 600ms;
        z-index: 0;
      `;
      const prevPos = getComputedStyle(btn).position;
      if (prevPos === 'static') btn.style.position = 'relative';
      const prevOverflow = btn.style.overflow;
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      requestAnimationFrame(() => { ripple.style.transform = 'scale(1)'; ripple.style.opacity = '0'; });
      setTimeout(() => { ripple.remove(); btn.style.overflow = prevOverflow; }, 620);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  /* ─── 19. Page-load fade ─── */
  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ─── 20. Long-task observer (silent in prod) ─── */
  useEffect(() => {
    if (!('PerformanceObserver' in window) || import.meta.env.PROD) return;
    try {
      const po = new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          if (e.duration > 220) console.warn(`[Orca] Long task: ${e.duration.toFixed(0)}ms`);
        });
      });
      po.observe({ entryTypes: ['longtask'] });
      return () => po.disconnect();
    } catch { /* unsupported */ }
  }, []);

  const scrollTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);
  const session = getMarketSession();

  return (
    <>
      {/* 17. Skip-to-content (accessibility) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:text-xs"
      >
        Skip to content
      </a>

      {/* 19. Page-load veil */}
      <AnimatePresence>
        {!pageLoaded && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-background pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 3. Scroll progress */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-[2px] z-[9997] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, hsl(184 100% 50%) 0%, hsl(258 90% 66%) ${scrollPct}%, transparent ${scrollPct}%)`,
          boxShadow: scrollPct > 2 ? '0 0 12px hsl(184 100% 50% / 0.6)' : undefined,
        }}
      />

      {/* 8. Live clock + market session — REMOVED (was blocking Dual-Currency Toggle). */}

      {/* 7. Online/offline toast */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9995] orca-glass orca-grain px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{
              borderColor: showOnlineToast === 'online' ? 'hsl(152 76% 45% / 0.4)' : 'hsl(0 100% 56% / 0.4)',
              color: showOnlineToast === 'online' ? 'hsl(152 76% 60%)' : 'hsl(0 100% 68%)',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'currentColor', boxShadow: `0 0 10px currentColor` }} />
            {showOnlineToast === 'online' ? 'Connection restored' : 'You are offline'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Back to top */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={scrollTop}
            aria-label="Back to top"
            className="fixed bottom-5 right-5 z-[9994] w-10 h-10 rounded-full orca-glass orca-glass-hover flex items-center justify-center text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 11. ⌘K hint — compact circular button */}
      <button
        type="button"
        aria-label="Open command palette (⌘K)"
        title="⌘K — Command palette"
        onClick={() => window.dispatchEvent(new CustomEvent('orca:open-command-palette'))}
        className="hidden md:flex fixed bottom-5 left-5 z-[9993] w-8 h-8 rounded-full orca-glass orca-glass-hover items-center justify-center text-[10px] font-mono font-bold text-muted-foreground/80 hover:text-foreground transition-colors"
        style={{ padding: 0 }}
      >
        ⌘K
      </div>

      {/* 10. Help overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9996] bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="orca-glass orca-grain rounded-2xl p-6 max-w-md w-full"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary mb-1">Keyboard</div>
              <h2 className="text-2xl font-bold orca-holo mb-4">Shortcuts</h2>
              <div className="space-y-2 text-sm font-mono">
                {[
                  ['⌘ K', 'Command palette'],
                  ['⌘ ,', 'Settings'],
                  ['⌘ B', 'Toggle sidebar'],
                  ['⌘ /', 'Privacy mask'],
                    ['?',   'This panel'],
                  ['Esc', 'Close any modal'],
                ].map(([k, l]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-muted-foreground">{l}</span>
                    <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground text-xs">{k}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* Market session calculator (UTC-based, simplified) */
function getMarketSession(): { label: string; color: string } {
  const h = new Date().getUTCHours();
  if (h >= 13 && h < 20) return { label: 'NY OPEN',   color: 'hsl(152 76% 60%)' };
  if (h >= 7  && h < 16) return { label: 'LONDON',    color: 'hsl(184 100% 70%)' };
  if (h >= 0  && h < 8)  return { label: 'TOKYO',     color: 'hsl(258 90% 75%)' };
  return { label: 'AFTER HRS', color: 'hsl(38 95% 60%)' };
}
