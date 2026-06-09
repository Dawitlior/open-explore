import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Gauge, BarChart3 } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';

export function MktHero() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).hero;

  const proof = [
    { icon: Shield,    title: t.proof1Title, desc: t.proof1Desc },
    { icon: Gauge,     title: t.proof2Title, desc: t.proof2Desc },
    { icon: BarChart3, title: t.proof3Title, desc: t.proof3Desc },
  ];

  const lines = [t.line1, t.line2, t.line3];

  return (
    <section id="top" className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
      <div className="mk-aurora" aria-hidden />
      <div className="mk-grid-bg" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
        {/* Free banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-6"
          style={{
            background: 'color-mix(in srgb, var(--mk-good) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--mk-good) 40%, transparent)',
            color: 'var(--mk-good)',
          }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--mk-good)' }} />
          {t.freeBanner}
        </motion.div>

        <h1 className="mk-display" style={{ fontSize: 'clamp(40px, 7vw, 76px)', lineHeight: 1.04 }}>
          {lines.map((line, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'block',
                color: i === 2 ? 'transparent' : 'var(--mk-text)',
                backgroundImage: i === 2 ? 'linear-gradient(135deg, var(--mk-primary), var(--mk-accent))' : undefined,
                backgroundClip: i === 2 ? 'text' : undefined,
                WebkitBackgroundClip: i === 2 ? 'text' : undefined,
              }}>
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}
          className="mx-auto mt-6 max-w-2xl text-base sm:text-lg"
          style={{ color: 'var(--mk-muted)', lineHeight: 1.6 }}>
          {t.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth?mode=register" className="mk-btn-primary">{t.ctaPrimary}</Link>
          <a href="#demo" className="mk-btn-ghost">{t.ctaSecondary}</a>
        </motion.div>

        {/* Technical proof cards (no social proof — per plan) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {proof.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.08, duration: 0.45 }}
              className="mk-card p-5 text-start"
            >
              <p.icon size={20} style={{ color: 'var(--mk-primary)' }} />
              <div className="mt-3 mk-display text-lg" style={{ color: 'var(--mk-text)' }}>{p.title}</div>
              <div className="mt-1 text-sm" style={{ color: 'var(--mk-muted)' }}>{p.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
