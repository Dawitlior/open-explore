import * as React from 'react';
import { ScrollStage, motion, useTransform, type MotionValue } from './ScrollStage';

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

const CYAN = '#22D3EE';
const DIM = 'rgba(255,255,255,0.08)';

const STEPS = (t: Props['t']) => [
  { k: 'sync',   label: t('סנכרון מהברוקר',    'Broker sync'),      hint: t('API READ-ONLY',    'API READ-ONLY') },
  { k: 'tag',    label: t('תיוג אוטומטי · AI', 'AI auto-tagging'),  hint: t('Setup · Session', 'Setup · Session') },
  { k: 'journal',label: t('עדכון ביומן',       'Journal update'),   hint: t('R-Multiple',       'R-Multiple') },
  { k: 'insight',label: t('תובנה כמותית',      'Quantitative insight'), hint: t('Edge detected', 'Edge detected') },
];

const Dot: React.FC<{ progress: MotionValue<number>; at: number }> = ({ progress, at }) => {
  const scale = useTransform(progress, [at - 0.08, at], [0.6, 1]);
  const opacity = useTransform(progress, [at - 0.08, at], [0.25, 1]);
  const glow = useTransform(progress, [at - 0.08, at], [0, 14]);
  const boxShadow = useTransform(glow, v => `0 0 ${v}px ${CYAN}`);
  return (
    <motion.div
      style={{
        width: 14, height: 14, borderRadius: 999,
        background: CYAN, scale, opacity, boxShadow,
        border: `2px solid ${CYAN}`,
      }}
    />
  );
};

const StatePanel: React.FC<{
  progress: MotionValue<number>;
  from: number; to: number;
  children: React.ReactNode;
}> = ({ progress, from, to, children }) => {
  const opacity = useTransform(progress, [from - 0.05, from, to, to + 0.05], [0, 1, 1, 0]);
  const y = useTransform(progress, [from - 0.05, from, to, to + 0.05], [16, 0, 0, -16]);
  return (
    <motion.div
      style={{
        position: 'absolute', inset: 0,
        opacity, y,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </motion.div>
  );
};

const Frame: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => (
  <div style={{
    width: 'min(520px, 92%)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
    border: `1px solid ${DIM}`,
    borderRadius: 14,
    padding: '18px 20px',
    boxShadow: '0 30px 80px -30px rgba(34,211,238,0.25)',
    backdropFilter: 'blur(8px)',
  }}>
    <div style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
      color: CYAN, marginBottom: 12,
    }}>{title}</div>
    {children}
  </div>
);

const Row: React.FC<{ cols: string[]; mono?: boolean; dim?: boolean }> = ({ cols, mono, dim }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
    gap: 8, padding: '8px 0',
    borderBottom: `1px solid ${DIM}`,
    fontFamily: mono ? 'IBM Plex Mono, monospace' : 'Poppins, sans-serif',
    fontSize: 12,
    color: dim ? 'rgba(255,255,255,0.55)' : '#fff',
  }}>
    {cols.map((c, i) => <div key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</div>)}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = CYAN }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 8px', borderRadius: 999,
    fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
    color, border: `1px solid ${color}55`,
    background: `${color}12`,
    marginInlineEnd: 6,
  }}>{children}</span>
);

export const ExecutionFlowStage: React.FC<Props> = ({ isRTL, t }) => {
  const steps = STEPS(t);
  const anchors = [0.12, 0.38, 0.62, 0.88]; // dot activations

  return (
    <section
      className="orca-section"
      style={{ paddingTop: 0, paddingBottom: 0, background: 'var(--bg-2)' }}
      aria-label={t('זרימת ביצוע', 'Execution flow')}
    >
      <ScrollStage heightVh={2.4}>
        {({ progress, reduced, isMobile }) => {
          // Timeline line growth
          const lineScale = useTransform(progress, [0, 1], [0, 1]);

          // Mobile / reduced: render all 4 states stacked
          if (reduced || isMobile) {
            return (
              <div style={{ padding: '48px 20px', maxWidth: 720, margin: '0 auto' }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10, letterSpacing: 2, color: CYAN, textAlign: 'center', marginBottom: 8,
                }}>{t('זרימת ביצוע', 'EXECUTION FLOW')}</div>
                <h2 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                  fontSize: 'clamp(22px, 6vw, 32px)', textAlign: 'center',
                  margin: '0 0 28px', color: '#fff',
                }}>
                  {t('מסחר → תובנה. אוטומטית.', 'Trade → insight. Automatically.')}
                </h2>
                {steps.map((s, i) => (
                  <div key={s.k} style={{
                    display: 'flex', gap: 14, padding: '14px 0',
                    borderBottom: `1px solid ${DIM}`,
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: 999, background: CYAN, marginTop: 6, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{i + 1}. {s.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'IBM Plex Mono, monospace' }}>{s.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div style={{
              height: '100%', display: 'grid',
              gridTemplateColumns: '340px 1fr',
              alignItems: 'center',
              gap: 40,
              maxWidth: 1200, margin: '0 auto',
              padding: '0 clamp(20px, 5vw, 60px)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}>
              {/* LEFT: sticky timeline */}
              <div style={{ position: 'relative', height: 420 }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10, letterSpacing: 2, color: CYAN, marginBottom: 10,
                }}>{t('זרימת ביצוע', 'EXECUTION FLOW')}</div>
                <h2 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                  fontSize: 28, lineHeight: 1.2, margin: '0 0 28px', color: '#fff',
                }}>
                  {isRTL
                    ? <>מסחר → תובנה.<br /><span style={{ color: CYAN }}>אוטומטית.</span></>
                    : <>Trade → insight.<br /><span style={{ color: CYAN }}>Automatically.</span></>}
                </h2>

                <div style={{ position: 'relative', paddingInlineStart: 8 }}>
                  {/* connector track */}
                  <div style={{
                    position: 'absolute', insetInlineStart: 14, top: 6, bottom: 6,
                    width: 2, background: DIM,
                  }} />
                  {/* connector fill */}
                  <motion.div
                    style={{
                      position: 'absolute', insetInlineStart: 14, top: 6,
                      width: 2, height: 'calc(100% - 12px)',
                      background: `linear-gradient(180deg, ${CYAN}, ${CYAN}00)`,
                      transformOrigin: 'top',
                      scaleY: lineScale,
                    }}
                  />
                  {steps.map((s, i) => (
                    <div key={s.k} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      padding: '10px 0', minHeight: 68,
                    }}>
                      <div style={{ width: 22, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                        <Dot progress={progress} at={anchors[i]} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{s.label}</div>
                        <div style={{
                          fontSize: 11, color: 'rgba(255,255,255,0.55)',
                          fontFamily: 'IBM Plex Mono, monospace', marginTop: 2,
                        }}>{s.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: morphing trade card */}
              <div style={{ position: 'relative', height: 340 }}>
                <StatePanel progress={progress} from={0.0} to={0.24}>
                  <Frame title={t('CSV גולמי · ברוקר', 'Raw CSV · Broker')}>
                    <Row cols={['time', 'symbol', 'side', 'qty', 'price']} mono dim />
                    <Row cols={['09:31:04', 'BTCUSDT', 'BUY', '0.12', '63,412.50']} mono />
                    <Row cols={['10:47:22', 'BTCUSDT', 'SELL', '0.12', '64,088.10']} mono />
                    <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {t('מסתנכרן דרך API · READ-ONLY', 'Syncing via API · READ-ONLY')}
                    </div>
                  </Frame>
                </StatePanel>

                <StatePanel progress={progress} from={0.26} to={0.5}>
                  <Frame title={t('AI · תיוג', 'AI · Tagging')}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>BTCUSDT · LONG</div>
                    <div style={{ marginBottom: 12 }}>
                      <Tag>{t('פריצה', 'Breakout')}</Tag>
                      <Tag color="#A78BFA">{t('לונדון', 'London')}</Tag>
                      <Tag color="#34D399">{t('מגמה עולה', 'Uptrend')}</Tag>
                    </div>
                    <Row cols={[t('כניסה', 'Entry'), '63,412.50']} mono />
                    <Row cols={[t('יציאה', 'Exit'), '64,088.10']} mono />
                    <Row cols={[t('סיכון', 'Risk'), '1.0R']} mono />
                  </Frame>
                </StatePanel>

                <StatePanel progress={progress} from={0.52} to={0.76}>
                  <Frame title={t('יומן · נרשם', 'Journal · Recorded')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>BTCUSDT</div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: '#34D399', fontWeight: 700 }}>
                        +1.28R
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>P&L</div>
                        <div style={{ color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>+$811.92</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t('משך', 'Duration')}</div>
                        <div style={{ color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>1h 16m</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t('סטאפ', 'Setup')}</div>
                        <div style={{ color: '#fff' }}>{t('פריצה', 'Breakout')}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t('סשן', 'Session')}</div>
                        <div style={{ color: '#fff' }}>{t('לונדון', 'London')}</div>
                      </div>
                    </div>
                  </Frame>
                </StatePanel>

                <StatePanel progress={progress} from={0.78} to={1.05}>
                  <Frame title={t('תובנה כמותית', 'Quantitative insight')}>
                    <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.6, marginBottom: 12 }}>
                      {t(
                        'עסקאות פריצה בסשן לונדון: 71% הצלחה, תוחלת 0.94R על 34 עסקאות אחרונות.',
                        'Breakouts in London session: 71% win-rate, 0.94R expectancy across last 34 trades.'
                      )}
                    </div>
                    <div style={{
                      display: 'flex', gap: 10, paddingTop: 12,
                      borderTop: `1px solid ${DIM}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Win-rate</div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: '#34D399', fontWeight: 700 }}>71%</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Expectancy</div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: CYAN, fontWeight: 700 }}>+0.94R</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>N</div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: '#fff', fontWeight: 700 }}>34</div>
                      </div>
                    </div>
                  </Frame>
                </StatePanel>
              </div>
            </div>
          );
        }}
      </ScrollStage>
    </section>
  );
};
