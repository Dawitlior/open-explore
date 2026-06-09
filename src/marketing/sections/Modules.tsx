import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

export function MktModules() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).modules;
  const [active, setActive] = useState(t.tabs[0].key);
  const ref = useReveal<HTMLElement>();

  const current = t.tabs.find(x => x.key === active) || t.tabs[0];

  return (
    <section id="features" ref={ref} className="mk-reveal py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{t.title}</h2>
          <p className="mt-3 max-w-2xl mx-auto" style={{ color: 'var(--mk-muted)' }}>{t.sub}</p>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex flex-wrap gap-2 justify-center mb-8">
          {t.tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className="px-4 py-2 rounded-full text-sm transition-all"
              style={{
                background: active === tab.key
                  ? 'linear-gradient(135deg, var(--mk-primary), var(--mk-primary-2))'
                  : 'transparent',
                color: active === tab.key ? '#00171a' : 'var(--mk-muted)',
                border: `1px solid ${active === tab.key ? 'transparent' : 'var(--mk-border)'}`,
                fontWeight: active === tab.key ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop panel */}
        <div className="hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mk-card p-8 md:p-10"
            >
              <h3 className="mk-display text-2xl" style={{ color: 'var(--mk-text)' }}>{current.label}</h3>
              <p className="mt-3 text-base max-w-3xl" style={{ color: 'var(--mk-muted)' }}>{current.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden space-y-2">
          {t.tabs.map(tab => {
            const isOpen = active === tab.key;
            return (
              <div key={tab.key} className="mk-card overflow-hidden">
                <button
                  onClick={() => setActive(isOpen ? '' : tab.key)}
                  className="w-full text-start px-4 py-3 flex items-center justify-between"
                  style={{ color: 'var(--mk-text)', fontWeight: 600 }}
                  aria-expanded={isOpen}
                >
                  {tab.label}
                  <span style={{ color: 'var(--mk-muted)' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm" style={{ color: 'var(--mk-muted)' }}>{tab.desc}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
