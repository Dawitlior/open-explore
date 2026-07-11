import * as React from 'react';
import { ScrollStage, motion, useTransform, type MotionValue } from './ScrollStage';

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

const PURPLE = '#8B5CF6';
const CYAN = '#22D3EE';
const DIM = 'rgba(255,255,255,0.06)';

/** 7 days × 12 hours (06:00–17:00). Values 0..1 = "edge intensity". */
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => 6 + i);

// Handcrafted "performance map" — clusters concentrate on Tue/Wed London open
// and Thu NY open, weak Fridays, dead weekends.
const MAP: number[][] = [
  /* Sun */ [0,0,0,0.05,0.08,0.05,0.02,0.03,0,0,0,0],
  /* Mon */ [0.05,0.12,0.22,0.40,0.55,0.48,0.30,0.35,0.42,0.25,0.10,0.05],
  /* Tue */ [0.10,0.28,0.55,0.82,0.95,0.78,0.42,0.55,0.68,0.40,0.18,0.08],
  /* Wed */ [0.12,0.30,0.60,0.88,1.00,0.85,0.48,0.62,0.75,0.45,0.20,0.10],
  /* Thu */ [0.10,0.25,0.50,0.70,0.80,0.65,0.55,0.72,0.90,0.60,0.28,0.12],
  /* Fri */ [0.08,0.15,0.28,0.42,0.48,0.35,0.22,0.20,0.18,0.10,0.05,0.02],
  /* Sat */ [0,0,0,0,0.02,0.02,0,0,0,0,0,0],
];

// Reveal order: cells appear based on a diagonal sweep + intensity ranking.
// Each cell gets an anchor in [0..1]; brighter cells reveal later (dramatic).
function buildAnchors(): { r: number; c: number; anchor: number; v: number }[] {
  const flat: { r: number; c: number; anchor: number; v: number }[] = [];
  for (let r = 0; r < MAP.length; r++) {
    for (let c = 0; c < MAP[r].length; c++) {
      const v = MAP[r][c];
      // Sweep base = diagonal (top-left → bottom-right), then push high-value cells later
      const sweep = (r + c) / (MAP.length + MAP[0].length);
      const anchor = Math.min(0.95, sweep * 0.55 + v * 0.4);
      flat.push({ r, c, v, anchor });
    }
  }
  return flat;
}
const ANCHORS = buildAnchors();

const Cell: React.FC<{
  progress: MotionValue<number>;
  anchor: number;
  v: number;
  size: number;
}> = ({ progress, anchor, v, size }) => {
  const opacity = useTransform(progress, [anchor - 0.06, anchor + 0.02], [0.05, 1]);
  const intensity = useTransform(progress, [anchor - 0.06, anchor + 0.02], [0, v]);
  const bg = useTransform(intensity, i => {
    // Blend purple → cyan at high edge, dim base at low
    const a = Math.max(0.06, i);
    if (i < 0.35) return `rgba(139, 92, 246, ${a})`;
    if (i < 0.7)  return `rgba(139, 92, 246, ${a})`;
    return `rgba(34, 211, 238, ${a})`;
  });
  const glow = useTransform(intensity, i => `0 0 ${i * 14}px rgba(${i > 0.7 ? '34,211,238' : '139,92,246'}, ${i * 0.5})`);
  return (
    <motion.div
      style={{
        width: size, height: size, borderRadius: 4,
        background: bg,
        boxShadow: glow,
        opacity,
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    />
  );
};

const Insight: React.FC<{
  progress: MotionValue<number>;
  from: number; to: number;
  label: string;
  title: string;
  metric: string;
  metricColor?: string;
}> = ({ progress, from, to, label, title, metric, metricColor = CYAN }) => {
  const opacity = useTransform(progress, [from - 0.04, from, to, to + 0.04], [0, 1, 1, 0]);
  const y = useTransform(progress, [from - 0.04, from, to, to + 0.04], [12, 0, 0, -12]);
  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity, y }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
        color: PURPLE, marginBottom: 8, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 22,
        color: '#fff', lineHeight: 1.3, marginBottom: 14,
      }}>{title}</div>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 34, fontWeight: 700,
        color: metricColor,
      }}>{metric}</div>
    </motion.div>
  );
};

export const TraderMindHeatmapStage: React.FC<Props> = ({ isRTL, t }) => {
  return (
    <section
      className="orca-section"
      style={{ paddingTop: 0, paddingBottom: 0, background: 'var(--bg-2)' }}
      aria-label={t('מפת חום · תודעת הסוחר', 'Trader Mind heatmap')}
    >
      <ScrollStage heightVh={2.6}>
        {({ progress, reduced, isMobile }) => {
          if (reduced || isMobile) {
            // Static: render the fully-revealed grid + summary
            const size = 22;
            return (
              <div style={{ padding: '48px 20px', maxWidth: 720, margin: '0 auto' }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
                  color: PURPLE, textAlign: 'center', marginBottom: 8,
                }}>{t('מפת חום · ביצועים', 'HEATMAP · PERFORMANCE')}</div>
                <h2 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                  fontSize: 'clamp(20px, 5.5vw, 28px)', textAlign: 'center',
                  margin: '0 0 24px', color: '#fff',
                }}>
                  {t('דפוסי הרווח שלך — חשופים.', 'Your winning patterns — exposed.')}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `24px repeat(${HOURS.length}, ${size}px)`, gap: 3 }}>
                    <div />
                    {HOURS.map(h => (
                      <div key={h} style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>{h}</div>
                    ))}
                    {MAP.map((row, r) => (
                      <React.Fragment key={r}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center' }}>
                          {(isRTL ? DAYS_HE : DAYS_EN)[r]}
                        </div>
                        {row.map((v, c) => (
                          <div key={c} style={{
                            width: size, height: size, borderRadius: 3,
                            background: v > 0.7 ? `rgba(34,211,238,${v})` : `rgba(139,92,246,${Math.max(0.06, v)})`,
                            boxShadow: v > 0.5 ? `0 0 ${v * 10}px rgba(${v > 0.7 ? '34,211,238' : '139,92,246'}, 0.4)` : undefined,
                            border: '1px solid rgba(255,255,255,0.04)',
                          }} />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <p style={{
                  marginTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.65)',
                  fontSize: 13, lineHeight: 1.6, maxWidth: 480, marginInline: 'auto',
                }}>
                  {t(
                    'שלישי · רביעי · פתיחת לונדון — 82% מהיתרון שלך. תודעת הסוחר יודעת מתי אתה בשיאך.',
                    'Tuesday · Wednesday · London open — 82% of your edge. Trader Mind knows when you peak.'
                  )}
                </p>
              </div>
            );
          }

          const cellSize = 34;
          return (
            <div style={{
              height: '100%', display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              alignItems: 'center', gap: 40,
              maxWidth: 1200, margin: '0 auto',
              padding: '0 clamp(20px, 5vw, 60px)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}>
              {/* LEFT: rotating insight overlays */}
              <div style={{ position: 'relative', height: 260 }}>
                <div style={{ position: 'absolute', top: -180, insetInlineStart: 0 }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
                    color: PURPLE, marginBottom: 8, textTransform: 'uppercase',
                  }}>{t('תודעת הסוחר · מפת חום', 'TRADER MIND · HEATMAP')}</div>
                  <h2 style={{
                    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: 1.2, margin: 0, color: '#fff',
                  }}>
                    {isRTL
                      ? <>דפוסי הרווח שלך — <span style={{ color: PURPLE }}>חשופים.</span></>
                      : <>Your winning patterns — <span style={{ color: PURPLE }}>exposed.</span></>}
                  </h2>
                </div>

                <Insight
                  progress={progress} from={0.05} to={0.28}
                  label={t('שלב 1 · סריקה', 'Phase 1 · Scan')}
                  title={t('12 השבועות האחרונים — כל עסקה, כל שעה.', 'Last 12 weeks — every trade, every hour.')}
                  metric="1,247" metricColor="#fff"
                />
                <Insight
                  progress={progress} from={0.30} to={0.55}
                  label={t('שלב 2 · אשכולות', 'Phase 2 · Clusters')}
                  title={t('שלישי · רביעי בסביבות פתיחת לונדון מובילים.', 'Tuesday · Wednesday around London open lead.')}
                  metric="+2.1R" metricColor={PURPLE}
                />
                <Insight
                  progress={progress} from={0.57} to={0.80}
                  label={t('שלב 3 · שיא הביצועים', 'Phase 3 · Peak')}
                  title={t('רביעי 10:00 — נקודת החום שלך.', 'Wednesday 10:00 — your hot-spot.')}
                  metric="88% WR" metricColor={CYAN}
                />
                <Insight
                  progress={progress} from={0.82} to={1.05}
                  label={t('שלב 4 · תובנה', 'Phase 4 · Insight')}
                  title={t('82% מהיתרון שלך מרוכז ב-14% מהזמן.', '82% of your edge lives in 14% of the time.')}
                  metric="14%" metricColor={CYAN}
                />
              </div>

              {/* RIGHT: heatmap */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `28px repeat(${HOURS.length}, ${cellSize}px)`,
                    gap: 4,
                  }}>
                    <div />
                    {HOURS.map(h => (
                      <div key={h} style={{
                        fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}>{h.toString().padStart(2, '0')}</div>
                    ))}
                    {MAP.map((row, r) => (
                      <React.Fragment key={r}>
                        <div style={{
                          fontSize: 10, color: 'rgba(255,255,255,0.45)',
                          fontFamily: 'IBM Plex Mono, monospace',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          paddingInlineEnd: 4,
                        }}>{(isRTL ? DAYS_HE : DAYS_EN)[r]}</div>
                        {row.map((v, c) => {
                          const a = ANCHORS.find(x => x.r === r && x.c === c)!;
                          return <Cell key={c} progress={progress} anchor={a.anchor} v={v} size={cellSize} />;
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{
                    marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 10, color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}>
                    <span>{t('נמוך', 'Low')}</span>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: `linear-gradient(90deg, rgba(139,92,246,0.15), rgba(139,92,246,0.9), ${CYAN})`,
                    }} />
                    <span>{t('שיא', 'Peak')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </ScrollStage>
    </section>
  );
};
