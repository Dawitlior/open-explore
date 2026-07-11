import * as React from 'react';
import { ScrollStage, motion, useTransform, type MotionValue } from './ScrollStage';
import { useMotionValueEvent } from 'framer-motion';

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

const PURPLE = '#8B5CF6';
const CYAN = '#22D3EE';

/** 7 days × 12 hours (06:00–17:00). Values 0..1 = "edge intensity". */
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_HE_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAYS_EN_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 12 }, (_, i) => 6 + i);

// Handcrafted "performance map". Clusters on Tue/Wed London open + Thu NY open.
const MAP: number[][] = [
  [0,0,0,0.05,0.08,0.05,0.02,0.03,0,0,0,0],
  [0.05,0.12,0.22,0.40,0.55,0.48,0.30,0.35,0.42,0.25,0.10,0.05],
  [0.10,0.28,0.55,0.82,0.95,0.78,0.42,0.55,0.68,0.40,0.18,0.08],
  [0.12,0.30,0.60,0.88,1.00,0.85,0.48,0.62,0.75,0.45,0.20,0.10],
  [0.10,0.25,0.50,0.70,0.80,0.65,0.55,0.72,0.90,0.60,0.28,0.12],
  [0.08,0.15,0.28,0.42,0.48,0.35,0.22,0.20,0.18,0.10,0.05,0.02],
  [0,0,0,0,0.02,0.02,0,0,0,0,0,0],
];

// Session labels per hour (UTC-ish demo mapping)
function sessionAt(hour: number, isRTL: boolean): string {
  if (hour < 8)  return isRTL ? 'אסיה' : 'Asia';
  if (hour < 13) return isRTL ? 'לונדון' : 'London';
  if (hour < 17) return isRTL ? 'ניו־יורק' : 'New York';
  return isRTL ? 'סגירה' : 'Close';
}

interface CellMeta { r: number; c: number; v: number; anchor: number; }
const ANCHORS: CellMeta[] = (() => {
  const out: CellMeta[] = [];
  for (let r = 0; r < MAP.length; r++) {
    for (let c = 0; c < MAP[r].length; c++) {
      const v = MAP[r][c];
      const sweep = (r + c) / (MAP.length + MAP[0].length);
      out.push({ r, c, v, anchor: Math.min(0.95, sweep * 0.55 + v * 0.4) });
    }
  }
  return out;
})();

/**
 * Pre-compute cell colour once (does not change with scroll) — only
 * opacity + a soft shadow toggle animate. Keeps GPU work minimal.
 */
function cellBase(v: number): { bg: string; shadow: string } {
  if (v < 0.15) return { bg: 'rgba(139,92,246,0.10)', shadow: 'none' };
  if (v < 0.5)  return { bg: `rgba(139,92,246,${Math.max(0.2, v)})`, shadow: 'none' };
  if (v < 0.75) return { bg: `rgba(139,92,246,${v})`, shadow: `0 0 8px rgba(139,92,246,0.35)` };
  return { bg: `rgba(34,211,238,${v})`, shadow: `0 0 12px rgba(34,211,238,0.55)` };
}

interface HoverPayload { r: number; c: number; x: number; y: number; }

/**
 * Grid renders once. All 84 cells subscribe to scroll via ONE
 * useMotionValueEvent listener that walks refs and mutates
 * `style.opacity` directly — no React re-render, no per-cell
 * MotionValue subscribers. Reveal is a step function per anchor,
 * so cells flip on/off individually while the shared listener
 * runs at raf cadence.
 */
const HeatmapGrid: React.FC<{
  progress: MotionValue<number>;
  isRTL: boolean;
  t: Props['t'];
  onHover: (h: HoverPayload | null) => void;
}> = ({ progress, isRTL, t, onHover }) => {
  const cellSize = 34;
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);

  useMotionValueEvent(progress, 'change', (p) => {
    // Single pass; imperative style writes only when the target changes.
    for (let i = 0; i < ANCHORS.length; i++) {
      const el = refs.current[i];
      if (!el) continue;
      const a = ANCHORS[i].anchor;
      // Ease-in reveal window of 0.08
      const t = Math.max(0, Math.min(1, (p - (a - 0.06)) / 0.08));
      // Cast to any to write to a numeric dataset without churn
      const prev = (el as unknown as { _o?: number })._o;
      const next = 0.05 + t * 0.95;
      if (prev === undefined || Math.abs(next - prev) > 0.02) {
        el.style.opacity = String(next);
        (el as unknown as { _o?: number })._o = next;
      }
    }
  });

  const daysShort = isRTL ? DAYS_HE : DAYS_EN;
  const daysFull  = isRTL ? DAYS_HE_FULL : DAYS_EN_FULL;

  return (
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
            }}>{daysShort[r]}</div>
            {row.map((v, c) => {
              const i = r * HOURS.length + c;
              const base = cellBase(v);
              return (
                <div
                  key={c}
                  ref={el => { refs.current[i] = el; }}
                  onMouseEnter={e => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    onHover({ r, c, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => onHover(null)}
                  aria-label={`${daysFull[r]} ${HOURS[c]}:00 — ${Math.round(v * 100)}%`}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: 4,
                    background: base.bg,
                    boxShadow: base.shadow,
                    border: '1px solid rgba(255,255,255,0.04)',
                    opacity: 0.05,
                    willChange: 'opacity',
                    transition: 'transform 120ms ease',
                    cursor: 'crosshair',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 10, color: 'rgba(255,255,255,0.55)',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          <span>{t('נמוך', 'Low')}</span>
          <div style={{
            flex: 1, height: 8, borderRadius: 4,
            background: `linear-gradient(90deg,
              rgba(139,92,246,0.10) 0%,
              rgba(139,92,246,0.45) 30%,
              rgba(139,92,246,0.85) 60%,
              ${CYAN} 100%)`,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }} />
          <span>{t('שיא', 'Peak')}</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 9, color: 'rgba(255,255,255,0.4)',
          fontFamily: 'IBM Plex Mono, monospace', marginTop: 4,
        }}>
          <span>0%</span>
          <span>{t('רגיל', 'Baseline')} · 30%</span>
          <span>{t('חזק', 'Strong')} · 60%</span>
          <span>{t('שיא · יתרון סטטיסטי', 'Peak · statistical edge')}</span>
        </div>
      </div>
    </div>
  );
};

const Tooltip: React.FC<{ payload: HoverPayload | null; isRTL: boolean; t: Props['t'] }> = ({ payload, isRTL, t }) => {
  if (!payload) return null;
  const { r, c, x, y } = payload;
  const v = MAP[r][c];
  const wr = Math.round(45 + v * 50); // synthetic: 45%..95%
  const R = (v * 2.4 - 0.2).toFixed(2);
  const n = Math.max(3, Math.round(v * 42));
  const label =
    v > 0.75 ? { text: t('שיא · יתרון סטטיסטי מובהק', 'Peak · statistically significant edge'), color: CYAN }
    : v > 0.5 ? { text: t('חזק', 'Strong'), color: PURPLE }
    : v > 0.2 ? { text: t('רגיל', 'Baseline'), color: 'rgba(255,255,255,0.7)' }
    : { text: t('חלש · הימנע', 'Weak · avoid'), color: 'rgba(255,255,255,0.4)' };

  return (
    <div style={{
      position: 'fixed', left: x, top: y - 12,
      transform: 'translate(-50%, -100%)',
      background: 'rgba(6, 19, 38, 0.96)',
      border: `1px solid ${label.color}55`,
      borderRadius: 8, padding: '10px 12px',
      pointerEvents: 'none', zIndex: 50,
      backdropFilter: 'blur(8px)',
      boxShadow: `0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px ${label.color}22`,
      minWidth: 180,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        color: label.color, textTransform: 'uppercase', marginBottom: 6,
      }}>{label.text}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
        {(isRTL ? DAYS_HE_FULL : DAYS_EN_FULL)[r]} · {HOURS[c].toString().padStart(2, '0')}:00
        <span style={{ opacity: 0.55, marginInlineStart: 6, fontSize: 11 }}>· {sessionAt(HOURS[c], isRTL)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>WR</div>
          <div style={{ fontSize: 14, color: '#fff' }}>{wr}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>Exp</div>
          <div style={{ fontSize: 14, color: label.color }}>{Number(R) >= 0 ? '+' : ''}{R}R</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>N</div>
          <div style={{ fontSize: 14, color: '#fff' }}>{n}</div>
        </div>
      </div>
    </div>
  );
};

const Insight: React.FC<{
  progress: MotionValue<number>;
  from: number; to: number;
  label: string; title: string; metric: string; metricColor?: string;
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
  const [hover, setHover] = React.useState<HoverPayload | null>(null);

  return (
    <section
      className="orca-section"
      style={{ paddingTop: 0, paddingBottom: 0, background: 'var(--bg-2)' }}
      aria-label={t('מפת חום · תודעת הסוחר', 'Trader Mind heatmap')}
    >
      <ScrollStage heightVh={2.6}>
        {({ progress, reduced, isMobile }) => {
          if (reduced || isMobile) {
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
                        {row.map((v, c) => {
                          const b = cellBase(v);
                          return (
                            <div key={c} style={{
                              width: size, height: size, borderRadius: 3,
                              background: b.bg, boxShadow: b.shadow,
                              border: '1px solid rgba(255,255,255,0.04)',
                            }} />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {/* Static legend */}
                <div style={{ marginTop: 20, maxWidth: 420, marginInline: 'auto' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 10, color: 'rgba(255,255,255,0.55)',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}>
                    <span>{t('נמוך', 'Low')}</span>
                    <div style={{
                      flex: 1, height: 8, borderRadius: 4,
                      background: `linear-gradient(90deg,
                        rgba(139,92,246,0.10),
                        rgba(139,92,246,0.85) 60%,
                        ${CYAN})`,
                    }} />
                    <span>{t('שיא', 'Peak')}</span>
                  </div>
                </div>
                <p style={{
                  marginTop: 20, textAlign: 'center', color: 'rgba(255,255,255,0.65)',
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
                <div style={{ position: 'absolute', top: -220, insetInlineStart: 0, maxWidth: 420 }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
                    color: PURPLE, marginBottom: 8, textTransform: 'uppercase',
                  }}>{t('תודעת הסוחר · מפת חום', 'TRADER MIND · HEATMAP')}</div>
                  <h2 style={{
                    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: 1.2, margin: '0 0 12px', color: '#fff',
                  }}>
                    {isRTL
                      ? <>דפוסי הרווח שלך — <span style={{ color: PURPLE }}>חשופים.</span></>
                      : <>Your winning patterns — <span style={{ color: PURPLE }}>exposed.</span></>}
                  </h2>
                  <p style={{
                    fontFamily: 'Poppins, sans-serif', fontSize: 13.5, lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.62)', margin: 0,
                  }}>
                    {t(
                      'כל תא ברשת הוא שעה בשבוע המסחר שלך. ככל שהוא בוהק יותר, כך היתרון הסטטיסטי גדול יותר. גלול כדי לראות איך המנוע מזהה אשכולות של רווח, מבודד את שיא הביצועים שלך, וחושף שרוב היתרון שלך חי בפחות משעות בודדות.',
                      'Every cell is one hour of your trading week. The brighter it burns, the stronger the statistical edge. Scroll to watch the engine surface profit clusters, isolate your single hottest hour, and reveal that most of your edge lives in just a handful of hours.'
                    )}
                  </p>
                </div>



                <Insight progress={progress} from={0.05} to={0.28}
                  label={t('שלב 1 · סריקה', 'Phase 1 · Scan')}
                  title={t('12 השבועות האחרונים — כל עסקה, כל שעה.', 'Last 12 weeks — every trade, every hour.')}
                  metric="1,247" metricColor="#fff" />
                <Insight progress={progress} from={0.30} to={0.55}
                  label={t('שלב 2 · אשכולות', 'Phase 2 · Clusters')}
                  title={t('שלישי · רביעי בסביבות פתיחת לונדון מובילים.', 'Tuesday · Wednesday around London open lead.')}
                  metric="+2.1R" metricColor={PURPLE} />
                <Insight progress={progress} from={0.57} to={0.80}
                  label={t('שלב 3 · שיא הביצועים', 'Phase 3 · Peak')}
                  title={t('רביעי 10:00 — נקודת החום שלך.', 'Wednesday 10:00 — your hot-spot.')}
                  metric="88% WR" metricColor={CYAN} />
                <Insight progress={progress} from={0.82} to={1.05}
                  label={t('שלב 4 · תובנה', 'Phase 4 · Insight')}
                  title={t('82% מהיתרון שלך מרוכז ב-14% מהזמן.', '82% of your edge lives in 14% of the time.')}
                  metric="14%" metricColor={CYAN} />
              </div>

              {/* RIGHT: heatmap */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <HeatmapGrid progress={progress} isRTL={isRTL} t={t} onHover={setHover} />
              </div>
            </div>
          );
        }}
      </ScrollStage>
      <Tooltip payload={hover} isRTL={isRTL} t={t} />
    </section>
  );
};
