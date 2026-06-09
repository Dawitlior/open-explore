import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

/**
 * LiveDemo placeholder.
 *
 * Per the approved plan v2: Option B (embed real <Index/> with demoMode={true})
 * requires invasive surgery on useTrades / useSettings / scopedStorage to honor
 * a demo flag. We hold here until the user explicitly approves that work — per
 * plan rule #2 ("דמו אמיתי או עצירה. אסור ליפול ל-fallback בלי אישור מפורש").
 *
 * This is NOT a fake dashboard. No invented charts, no fabricated screens.
 * Just a clean "coming online" surface that points to the real product.
 */
export function MktLiveDemo() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).demo;
  const ref = useReveal<HTMLElement>();

  return (
    <section id="demo" ref={ref} className="mk-reveal py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{t.title}</h2>
          <p className="mt-3 max-w-2xl mx-auto" style={{ color: 'var(--mk-muted)' }}>{t.sub}</p>
        </div>

        <div className="mk-card relative overflow-hidden">
          {/* Chrome */}
          <div className="flex items-center justify-between px-4 py-2 border-b"
               style={{ borderColor: 'var(--mk-border)', background: 'var(--mk-bg-elev)' }}>
            <span className="text-sm" style={{ color: 'var(--mk-muted)' }}>🐋 ORCA — Demo</span>
            <span className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--mk-accent)', color: '#1a1408', fontWeight: 700 }}>
              {t.dataLabel}
            </span>
          </div>

          {/* Body */}
          <div className="px-6 py-20 sm:py-28 text-center"
               style={{
                 background: `
                   radial-gradient(60% 40% at 50% 0%, color-mix(in srgb, var(--mk-primary) 12%, transparent), transparent 70%),
                   var(--mk-surface)
                 `,
               }}>
            <Sparkles size={36} style={{ color: 'var(--mk-primary)', margin: '0 auto' }} />
            <div className="mt-4 mk-display text-2xl" style={{ color: 'var(--mk-text)' }}>{t.comingSoon}</div>
            <p className="mt-3 max-w-md mx-auto text-sm" style={{ color: 'var(--mk-muted)' }}>{t.comingSoonDesc}</p>
            <Link to="/auth?mode=register" className="mk-btn-primary inline-block mt-6">{t.openCta}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
