import * as React from 'react';
import { ScrollStage, motion, useTransform, type MotionValue } from './ScrollStage';

/**
 * Phase 5 — Scrollytelling Finale.
 *
 * A single sticky stage that summarises the whole journey:
 *   1) Your Edge   — the metrics that define your statistical advantage
 *   2) Your Risks  — the guardrails that keep the edge intact
 *   3) Next Actions — 3 concrete moves for tomorrow morning
 *
 * The three columns fade/slide in sequentially as the reader scrolls, then a
 * final CTA panel arrives. Non-destructive: no existing routes, CTAs or
 * Supabase wiring touched. Reduced-motion / mobile fall back to a stacked
 * static layout via ScrollStage.
 */

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
  onCTA: () => void;
}

const CYAN = '#22D3EE';
const PURPLE = '#8B5CF6';
const AMBER = '#F59E0B';
const MINT = '#34D399';

type Pillar = {
  key: 'edge' | 'risk' | 'next';
  label: string;
  title: string;
  color: string;
  lines: { k: string; v: string }[];
  foot: string;
};

export const FinaleStage: React.FC<Props> = ({ isRTL, t, onCTA }) => {
  const pillars: Pillar[] = React.useMemo(() => ([
    {
      key: 'edge',
      label: t('הקצה שלך', 'Your Edge'),
      title: t('חמישה מדדים. גיאומטריה אחת.', 'Five metrics. One geometry.'),
      color: CYAN,
      lines: [
        { k: 'Win Rate',      v: '62%' },
        { k: 'Avg R:R',       v: '2.4R' },
        { k: 'Profit Factor', v: '3.1' },
        { k: 'Expectancy',    v: '+0.9R' },
        { k: 'Consistency',   v: '81/100' },
      ],
      foot: t('הקצה שלך אינו מספר — הוא צורה של חמישה מדדים מיושרים.',
              "Your edge isn't a number — it's the shape of five aligned metrics."),
    },
    {
      key: 'risk',
      label: t('הסיכונים שלך', 'Your Risks'),
      title: t('ארבע שכבות הגנה. אפס דריפט.', 'Four layers of defence. Zero drift.'),
      color: AMBER,
      lines: [
        { k: t('לעסקה',  'Per trade'),  v: '-1R' },
        { k: t('יומי',   'Daily'),      v: '-2R' },
        { k: t('שבועי',  'Weekly'),     v: '-5R' },
        { k: t('חודשי',  'Monthly'),    v: '-10R' },
        { k: t('קול-אוף','Cool-off'),  v: 'AUTO' },
      ],
      foot: t('מנוע הסיכון עוצר את היום לפני שהיום עוצר אותך.',
              'The risk engine stops the day before the day stops you.'),
    },
    {
      key: 'next',
      label: t('הצעדים הבאים', 'Next Actions'),
      title: t('שלושה דברים למחר בבוקר.', 'Three things for tomorrow morning.'),
      color: MINT,
      lines: [
        { k: '01', v: t('חבר את החשבון',       'Connect your account') },
        { k: '02', v: t('קבל את פרופיל התודעה', 'Get your Trader Mind profile') },
        { k: '03', v: t('סרוק את ה-Edge שלך',  'Scan your live Edge') },
      ],
      foot: t('שלוש דקות. ללא כרטיס אשראי. הנתונים שלך נשארים שלך.',
              'Three minutes. No credit card. Your data stays yours.'),
    },
  ]), [t]);

  return (
    <section
      aria-labelledby="finale-heading"
      style={{ paddingTop: 0, paddingBottom: 0, background: 'var(--bg-2)' }}
    >
      <ScrollStage heightVh={2.0}>
        {({ progress, reduced, isMobile }) => (
          <FinaleContent
            pillars={pillars}
            progress={progress}
            reduced={reduced}
            isMobile={isMobile}
            isRTL={isRTL}
            t={t}
            onCTA={onCTA}
          />
        )}
      </ScrollStage>
    </section>
  );
};

const FinaleContent: React.FC<{
  pillars: Pillar[];
  progress: MotionValue<number>;
  reduced: boolean;
  isMobile: boolean;
  isRTL: boolean;
  t: (he: string, en: string) => string;
  onCTA: () => void;
}> = ({ pillars, progress, reduced, isMobile, isRTL, t, onCTA }) => {
  const disabled = reduced || isMobile;

  // Sequential reveal windows.
  const opA = useTransform(progress, [0.02, 0.18, 0.98, 1.0], [0, 1, 1, 1]);
  const opB = useTransform(progress, [0.18, 0.34, 0.98, 1.0], [0, 1, 1, 1]);
  const opC = useTransform(progress, [0.34, 0.50, 0.98, 1.0], [0, 1, 1, 1]);
  const opCTA = useTransform(progress, [0.55, 0.72, 1.0], [0, 1, 1]);

  const yA = useTransform(progress, [0.02, 0.18], [24, 0]);
  const yB = useTransform(progress, [0.18, 0.34], [24, 0]);
  const yC = useTransform(progress, [0.34, 0.50], [24, 0]);
  const yCTA = useTransform(progress, [0.55, 0.72], [20, 0]);

  const ops = [opA, opB, opC];
  const ys = [yA, yB, yC];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: disabled ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: disabled ? '56px 20px' : 'clamp(48px, 6vh, 80px) 20px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 4vh, 44px)' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: PURPLE, marginBottom: 10 }}>
            PHASE · 05 — FINALE
          </div>
          <h2
            id="finale-heading"
            style={{
              fontSize: 'clamp(1.8rem, 3.6vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {isRTL ? (
              <>המסע נגמר. <span className="grad-text">המשמעת מתחילה.</span></>
            ) : (
              <>The journey ends. <span className="grad-text">The discipline begins.</span></>
            )}
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 'clamp(14px, 1.2vw, 16px)',
            lineHeight: 1.7,
            maxWidth: 640,
            margin: '14px auto 0',
          }}>
            {t(
              'הכל שראית — הקצה, הסיכונים, השכבות ההתנהגותיות — מתאחד לתמונה אחת. זהו הסוחר שאתה הופך להיות.',
              'Everything you just saw — the edge, the risks, the behavioural layers — converges into one picture. This is the trader you become.'
            )}
          </p>
        </div>

        {/* Three pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: disabled ? '1fr' : 'repeat(3, 1fr)',
            gap: disabled ? 16 : 22,
          }}
        >
          {pillars.map((p, i) => {
            const style = disabled
              ? { opacity: 1 }
              : { opacity: ops[i], y: ys[i] as unknown as number };
            return (
              <motion.article
                key={p.key}
                style={style}
                className="glass-card"
                aria-label={p.label}
              >
                <div style={{ padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: p.color, boxShadow: `0 0 10px ${p.color}`,
                    }} />
                    <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: p.color }}>
                      {p.label.toUpperCase()}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
                    fontWeight: 800, margin: '4px 0 14px', lineHeight: 1.25,
                    color: 'var(--text)',
                  }}>
                    {p.title}
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                    {p.lines.map(l => (
                      <li key={l.k} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        fontSize: 13,
                      }}>
                        <span className="mono" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{l.k}</span>
                        <span className="mono" style={{ color: p.color, fontWeight: 700 }}>{l.v}</span>
                      </li>
                    ))}
                  </ul>
                  <p style={{
                    marginTop: 14, marginBottom: 0,
                    fontSize: 12.5, lineHeight: 1.55,
                    color: 'var(--text-muted)',
                  }}>
                    {p.foot}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Final CTA */}
        <motion.div
          style={disabled ? { opacity: 1, marginTop: 28 } : { opacity: opCTA, y: yCTA as unknown as number, marginTop: 32 }}
        >
          <div
            className="glass-card"
            style={{
              padding: 'clamp(20px, 3vw, 28px)',
              textAlign: 'center',
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.14), transparent 60%), var(--glass)',
              borderColor: 'rgba(52,211,153,0.28)',
            }}
          >
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: MINT, marginBottom: 8 }}>
              READY · WHEN · YOU · ARE
            </div>
            <h3 style={{
              fontSize: 'clamp(1.3rem, 2.4vw, 1.9rem)',
              fontWeight: 800, letterSpacing: '-0.01em', margin: '2px 0 10px',
              lineHeight: 1.2,
            }}>
              {t('הפוך את הקצה שלך למערכת.', 'Turn your edge into a system.')}
            </h3>
            <p style={{
              color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65,
              maxWidth: 560, margin: '0 auto 18px',
            }}>
              {t(
                'התחל בחינם. חבר חשבון. תן ל-ORCA לתרגם את העסקאות שלך למשמעת מדידה.',
                'Start free. Connect an account. Let ORCA translate your trades into measurable discipline.'
              )}
            </p>
            <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="grad-btn" onClick={onCTA}>
                {t('התחל בחינם', 'Start free')}
                <span aria-hidden style={{ display: 'inline-block', transform: isRTL ? 'scaleX(-1)' : 'none' }}>→</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
