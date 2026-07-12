import * as React from 'react';
import { ScrollStage, motion, useTransform, type MotionValue } from './ScrollStage';

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

const CYAN = '#22D3EE';
const PURPLE = '#8B5CF6';
const GREEN = '#34D399';
const DIM = 'rgba(255,255,255,0.08)';

/**
 * Three semantic layers of a single trade card. Each has its own
 * accent + copy. As scroll progresses, the master card "explodes"
 * apart: layers drift out of alignment, tilt, and expose their
 * distinct data channels.
 */
type LayerDef = {
  key: 'broker' | 'ai' | 'portfolio';
  color: string;
  label: (t: Props['t']) => string;
  title: (t: Props['t']) => string;
  desc:  (t: Props['t']) => string;
  rows:  (t: Props['t']) => [string, string][];
};

const LAYERS: LayerDef[] = [
  {
    key: 'broker', color: CYAN,
    label: t => t('שכבה 1 · דאטה מהברוקר',      'Layer 1 · Broker data'),
    title: t => t('העובדות הגולמיות',            'The raw facts'),
    desc:  t => t(
      'זמן חתימה, מחיר מילוי, עמלה, סליפאג׳ — נמשך ישירות דרך API READ-ONLY. אין הזנה ידנית, אין שגיאות הקלדה.',
      'Timestamp, fill price, fees, slippage — pulled directly via READ-ONLY API. No manual entry, no fat-finger errors.'
    ),
    rows: t => [
      [t('סימבול',    'Symbol'),    'BTCUSDT'],
      [t('כניסה',     'Entry'),     '63,412.50'],
      [t('יציאה',     'Exit'),      '64,088.10'],
      [t('כמות',      'Qty'),       '0.12'],
      [t('עמלה',      'Fee'),       '$1.94'],
      [t('סליפאג׳',   'Slippage'),  '0.03%'],
    ],
  },
  {
    key: 'ai', color: PURPLE,
    label: t => t('שכבה 2 · לוגיקת AI',          'Layer 2 · AI logic'),
    title: t => t('ההקשר שהמנוע זיהה',           'The context the engine detected'),
    desc:  t => t(
      'סטאפ, סשן, מגמת מקרו, מצב־רוח מהיומן — מוצלבים באוטומט. אתה מקבל תיוג שסוחר מקצועי היה נותן, בלי לחשוב על זה.',
      'Setup, session, macro trend, journal mood — cross-referenced automatically. You get the tagging a pro trader would give, without thinking about it.'
    ),
    rows: t => [
      [t('סטאפ',      'Setup'),     t('פריצת התנגדות', 'Resistance breakout')],
      [t('סשן',       'Session'),   t('פתיחת לונדון',  'London open')],
      [t('מגמה',      'Trend'),     t('עולה · 4h',      'Uptrend · 4h')],
      [t('בטחון AI',  'AI confidence'), '87%'],
      [t('רגש',       'Emotion'),   t('ממוקד',          'Focused')],
      [t('דגלים',     'Flags'),     t('אין',            'None')],
    ],
  },
  {
    key: 'portfolio', color: GREEN,
    label: t => t('שכבה 3 · השפעה על תיק',       'Layer 3 · Portfolio impact'),
    title: t => t('איך זה משנה את המשוואה',       'How it moves the equation'),
    desc:  t => t(
      'R-Multiple, השפעה על תוחלת, קורלציה לפוזיציות פתוחות, דראודאון תאורטי — מחושבים ברגע שהעסקה נסגרת.',
      'R-multiple, expectancy delta, correlation to open positions, theoretical drawdown — all recomputed the second the trade closes.'
    ),
    rows: t => [
      ['R-Multiple',                    '+1.28R'],
      ['P&L',                           '+$811.92'],
      [t('תוחלת חדשה', 'New expectancy'), '+0.94R'],
      [t('WR מעודכן',  'Updated WR'),     '71%'],
      [t('קורלציה',    'Correlation'),    'ETH · 0.62'],
      [t('דראודאון',   'Drawdown'),       '-3.2R'],
    ],
  },
];

const Layer: React.FC<{
  progress: MotionValue<number>;
  def: LayerDef;
  index: number;
  focused: number; // 0..2 currently focused layer index (from progress)
  isRTL: boolean;
  t: Props['t'];
}> = ({ progress, def, index, focused, isRTL, t }) => {
  // Explosion: layers separate horizontally + vertically between progress 0.15→0.65
  const spread = useTransform(progress, [0.05, 0.35, 0.75, 1], [0, 1, 1, 1]);
  const dx = useTransform(spread, s => (index - 1) * s * 120);   // px
  const dy = useTransform(spread, s => (index - 1) * s * -46);
  const rot = useTransform(spread, s => (index - 1) * s * -4);   // deg
  // Focus emphasis (scale + opacity + z)
  const isFocused = focused === index;
  const scale = useTransform(spread, s => 1 + (isFocused ? s * 0.04 : 0));
  const opacity = useTransform(spread, s => (isFocused ? 1 : 1 - s * 0.35));

  const rows = def.rows(t);

  return (
    <motion.div
      style={{
        position: 'absolute',
        insetInlineStart: '50%', top: '50%',
        translateX: '-50%', translateY: '-50%',
        x: dx, y: dy, rotate: rot, scale, opacity,
        width: 320,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
        border: `1px solid ${isFocused ? def.color + '66' : DIM}`,
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: isFocused
          ? `0 30px 80px -20px ${def.color}55, 0 0 0 1px ${def.color}22`
          : '0 20px 60px -30px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        zIndex: isFocused ? 3 : 3 - Math.abs(focused - index),
        direction: isRTL ? 'rtl' : 'ltr',
        willChange: 'transform, opacity',
      }}
    >
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: 2,
        color: def.color, textTransform: 'uppercase', marginBottom: 10,
      }}>{def.label(t)}</div>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
        {def.title(t)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 12 }}>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{k}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#fff' }}>{v}</div>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

const LayerNarrative: React.FC<{
  progress: MotionValue<number>;
  from: number; to: number;
  def: LayerDef;
  t: Props['t'];
}> = ({ progress, from, to, def, t }) => {
  const opacity = useTransform(progress, [from - 0.03, from, to, to + 0.03], [0, 1, 1, 0]);
  const y = useTransform(progress, [from - 0.03, from, to, to + 0.03], [10, 0, 0, -10]);
  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity, y }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
        color: def.color, marginBottom: 10, textTransform: 'uppercase',
      }}>{def.label(t)}</div>
      <div style={{
        fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 24,
        color: '#fff', lineHeight: 1.3, marginBottom: 14,
      }}>{def.title(t)}</div>
      <p style={{
        fontFamily: 'Poppins, sans-serif', fontSize: 14, lineHeight: 1.7,
        color: 'rgba(255,255,255,0.7)', margin: 0,
      }}>{def.desc(t)}</p>
    </motion.div>
  );
};

export const TradeCardExplodeStage: React.FC<Props> = ({ isRTL, t }) => {
  return (
    <section
      className="orca-section"
      style={{ paddingTop: 0, paddingBottom: 0 }}
      aria-label={t('פירוק עסקה לשכבות', 'Trade decomposition')}
    >
      <ScrollStage heightVh={1.9}>
        {({ progress, reduced, isMobile }) => {
          // Focused layer index derived from progress bands.
          // React state kept in sync via a motion value listener.
          const [focused, setFocused] = React.useState(0);
          React.useEffect(() => {
            const unsub = progress.on('change', (p) => {
              const next = p < 0.38 ? 0 : p < 0.70 ? 1 : 2;
              setFocused(prev => prev === next ? prev : next);
            });
            return () => unsub();
          }, []);

          if (reduced || isMobile) {
            return (
              <div style={{ padding: '48px 20px', maxWidth: 720, margin: '0 auto' }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
                  color: CYAN, textAlign: 'center', marginBottom: 8,
                }}>{t('פירוק עסקה · אנטומיה', 'TRADE ANATOMY · DECOMPOSED')}</div>
                <h2 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                  fontSize: 'clamp(20px, 5.5vw, 28px)', textAlign: 'center',
                  margin: '0 0 12px', color: '#fff',
                }}>
                  {t('עסקה אחת. שלוש שכבות של אמת.', 'One trade. Three layers of truth.')}
                </h2>
                <p style={{
                  textAlign: 'center', color: 'rgba(255,255,255,0.6)',
                  fontSize: 13, lineHeight: 1.65, maxWidth: 480, marginInline: 'auto',
                }}>
                  {t(
                    'כרטיס העסקה שלך הוא לא שורה בגיליון. הוא נבנה משלוש שכבות עצמאיות — דאטה מהברוקר, לוגיקת AI, והשפעה על התיק — שמאפשרות ניתוח לעומק אמיתי.',
                    'Your trade card is not a spreadsheet row. It is built from three independent layers — broker data, AI logic, and portfolio impact — enabling real deep-dive analysis.'
                  )}
                </p>
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {LAYERS.map(def => {
                    const rows = def.rows(t);
                    return (
                      <div key={def.key} style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        border: `1px solid ${def.color}33`,
                        borderRadius: 12, padding: '14px 16px',
                      }}>
                        <div style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: 2,
                          color: def.color, textTransform: 'uppercase', marginBottom: 6,
                        }}>{def.label(t)}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{def.title(t)}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>{def.desc(t)}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 12 }}>
                          {rows.map(([k, v]) => (
                            <React.Fragment key={k}>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{k}</div>
                              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#fff' }}>{v}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              {/* LEFT: narrative */}
              <div style={{ position: 'relative', height: 320 }}>
                <div style={{ position: 'absolute', top: -160, insetInlineStart: 0, maxWidth: 440 }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 2,
                    color: CYAN, marginBottom: 8, textTransform: 'uppercase',
                  }}>{t('פירוק עסקה · אנטומיה', 'TRADE ANATOMY · EXPLODED VIEW')}</div>
                  <h2 style={{
                    fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: 1.2, margin: '0 0 12px', color: '#fff',
                  }}>
                    {isRTL
                      ? <>עסקה אחת.<br /><span style={{ color: CYAN }}>שלוש שכבות של אמת.</span></>
                      : <>One trade.<br /><span style={{ color: CYAN }}>Three layers of truth.</span></>}
                  </h2>
                  <p style={{
                    fontFamily: 'Poppins, sans-serif', fontSize: 13.5, lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.62)', margin: 0,
                  }}>
                    {t(
                      'רוב הפלטפורמות מציגות עסקה כשורה בגיליון. ORCA בונה כל עסקה משלוש שכבות עצמאיות שאפשר לפרק, לחקור ולהצליב. גלול כדי לראות את הכרטיס מתפרק לשכבות שלו — ולהבין למה ניתוח לעומק כאן הוא אמיתי.',
                      'Most platforms treat a trade as a spreadsheet row. ORCA builds every trade out of three independent, cross-referenceable layers you can peel apart. Scroll to watch the card decompose — and see why deep-dive analysis here is actually deep.'
                    )}
                  </p>
                </div>

                <LayerNarrative progress={progress} from={0.05} to={0.35} def={LAYERS[0]} t={t} />
                <LayerNarrative progress={progress} from={0.38} to={0.68} def={LAYERS[1]} t={t} />
                <LayerNarrative progress={progress} from={0.71} to={1.05} def={LAYERS[2]} t={t} />
              </div>

              {/* RIGHT: exploding stack */}
              <div style={{ position: 'relative', height: 420 }}>
                {LAYERS.map((def, i) => (
                  <Layer
                    key={def.key}
                    progress={progress}
                    def={def}
                    index={i}
                    focused={focused}
                    isRTL={isRTL}
                    t={t}
                  />
                ))}
                {/* Layer index dots */}
                <div style={{
                  position: 'absolute', bottom: -30, insetInlineStart: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  {LAYERS.map((def, i) => (
                    <div key={def.key} style={{
                      width: focused === i ? 22 : 6, height: 6, borderRadius: 3,
                      background: focused === i ? def.color : 'rgba(255,255,255,0.2)',
                      transition: 'all 260ms ease',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          );
        }}
      </ScrollStage>
    </section>
  );
};
