import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { GlassCard } from '@/components/trading/TradingUI';
import { useLang } from '@/hooks/use-lang';
import { enrich } from '@/lib/orca-metrics-core';
import { analyzeSegments } from '@/lib/orca-segment-insights';
import { runEdgeEngine } from '@/lib/orca-edge-engine';
import type { Trade } from '@/data/trades';

const MONO = "'JetBrains Mono', monospace";
const fmtR = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}R`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTheme = any;

export default function IntelligenceSection({ trades, T, enabled }: { trades: Trade[]; T: AnyTheme; enabled: boolean }) {
  const { t, isRTL } = useLang();
  const lang: 'he' | 'en' = isRTL ? 'he' : 'en';
  const Nlabel = (n: number) => lang === 'he' ? `${n} עסקאות` : `${n} trades`;

  // token resolver — inherits page palette
  const C = {
    cyan: T?.accent?.cyan ?? '#38BDF8',
    green: T?.accent?.green ?? '#34D399',
    red: T?.accent?.red ?? '#F87171',
    orange: T?.accent?.orange ?? '#FB923C',
    purple: T?.accent?.purple ?? '#A78BFA',
    text: T?.text?.primary ?? T?.text ?? '#E6EEF8',
    mut: T?.text?.muted ?? T?.textMuted ?? '#8FA3BF',
    dim: T?.text?.secondary ?? '#5C7390',
    border: 'rgba(56,189,248,0.16)',
  };

  const data = useMemo(() => {
    if (!enabled || !trades?.length) return null;
    const e = enrich(trades);
    return { e, seg: analyzeSegments(e, lang), edge: runEdgeEngine(e) };
  }, [enabled, trades, lang]);

  if (!data) return null;
  const { seg, edge } = data;

  const verdictColor = (v: string) => v === 'strong' ? C.green : v === 'weak' ? C.red : C.dim;

  const Eyebrow = ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.26em', color: color ?? C.cyan, opacity: 0.9, marginBottom: 8 }}>{children}</div>
  );

  return (
    <div style={{ marginTop: 22 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <Eyebrow>ORCA · INTELLIGENCE LAYER</Eyebrow>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>{t('מודיעין סוחר', 'Trader Intelligence')}</h3>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.mut, textAlign: isRTL ? 'left' : 'right' }}>
          {t('מבוסס על', 'Based on')} <b style={{ color: C.text }}>{Nlabel(seg.totalN)}</b> ·{' '}
          {t('אמינות', 'reliability')}:{' '}
          <b style={{ color: seg.reliability === 'high' ? C.green : seg.reliability === 'medium' ? C.cyan : C.orange }}>
            {t(
              ({ high: 'גבוהה', medium: 'בינונית', low: 'נמוכה', insufficient: 'לא מספיקה' } as Record<string, string>)[seg.reliability],
              ({ high: 'high', medium: 'medium', low: 'low', insufficient: 'insufficient' } as Record<string, string>)[seg.reliability],
            )}
          </b>
        </div>
      </div>

      {/* segments */}
      <GlassCard T={T}>
        <div style={{ padding: '4px 2px' }}>
          <Eyebrow>{t('מתי אתה סוחר טוב · SEGMENTS', 'WHEN YOU TRADE WELL · SEGMENTS')}</Eyebrow>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: C.text, margin: '6px 0 18px' }}>{seg.narrative}</p>
          <div style={{
            direction: 'ltr',
            padding: '14px 16px',
            background: 'linear-gradient(180deg, rgba(8,18,36,0.55), rgba(8,18,36,0.25))',
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {seg.byDow.map((s, idx) => {
              const maxAbs = Math.max(...seg.byDow.map(x => Math.abs(x.expectancy)), 0.01);
              const w = Math.min(100, Math.abs(s.expectancy) / maxAbs * 100);
              const dim = s.verdict === 'gray' || s.verdict === 'insufficient';
              const col = verdictColor(s.verdict);
              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '9px 4px',
                  borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  opacity: dim ? 0.62 : 1,
                }}>
                  <div style={{ flex: '0 0 72px', textAlign: isRTL ? 'right' : 'left', fontSize: 13, color: C.text, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 999, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: 0, width: `${w}%`,
                      background: `linear-gradient(90deg, ${col}55, ${col})`,
                      borderRadius: 999,
                      boxShadow: dim ? 'none' : `0 0 12px ${col}55`,
                      transition: 'width 600ms ease',
                    }} />
                  </div>
                  <div style={{
                    flex: '0 0 160px', fontFamily: MONO, fontSize: 12, color: col,
                    textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600,
                  }}>
                    {fmtR(s.expectancy)} <span style={{ color: C.dim, margin: '0 6px' }}>·</span>
                    <span style={{ color: dim ? C.mut : C.text }}>{Nlabel(s.n)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>


      {/* edge engine */}
      <div style={{ marginTop: 16 }}>
        <GlassCard T={T}>
          <div style={{ padding: '4px 2px' }}>
            <Eyebrow color={C.purple}>{t('מנוע ה-EDGE · מודל שלמד אותך', 'EDGE ENGINE · a model that learned you')}</Eyebrow>

            {!edge.ok ? (
              <p style={{ fontSize: 14, color: C.mut, margin: '10px 0 0', lineHeight: 1.6 }}>
                {t(
                  `צריך לפחות 30 עסקאות לאימון אמין (כרגע ${Nlabel(seg.totalN)}). ככל שתעלה עוד טריידים, המנוע ילמד אותך טוב יותר.`,
                  `Need at least 30 trades for reliable training (currently ${Nlabel(seg.totalN)}). The more trades you add, the better it learns you.`,
                )}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: C.mut, margin: '6px 0 14px', lineHeight: 1.7 }}>
                  {t(
                    'המנוע אימן את עצמו על העבר שלך, ואז ניסה לנבא על עסקאות שלא ראה — בדיוק כמו שזה היה עובד בזמן אמת.',
                    'The engine trained on your past, then tried to predict on trades it never saw — exactly how it would work in real time.',
                  )}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '0 0 16px' }}>
                  <Stat C={C} label={t('דיוק המודל (out-of-sample)', 'Model accuracy (out-of-sample)')} value={edge.testAUC.toFixed(3)} color={C.cyan}
                    sub={t(`0.5 = ניחוש, 1.0 = מושלם`, `0.5 = guessing, 1.0 = perfect`)} />
                  <Stat C={C} label={t('בלי המנוע (כל העסקאות)', 'Without engine (all trades)')} value={fmtR(edge.allR)} color={edge.allR >= 0 ? C.green : C.red} sub={Nlabel(edge.testN)} />
                  <Stat C={C} label={t('עם המנוע (סינון אוטומטי)', 'With engine (auto-filter)')} value={fmtR(edge.keptR)} color={edge.keptR >= 0 ? C.green : C.red} sub={Nlabel(edge.keptN)} />
                </div>

                {/* Plain-language summary — directional */}
                <p style={{ fontSize: 15, lineHeight: 1.85, color: C.text, margin: '0 0 14px' }}>
                  {(() => {
                    const better = edge.keptR > edge.allR;
                    const delta = Math.abs(edge.keptR - edge.allR);
                    if (better) {
                      return t(
                        `המנוע סינן ${Nlabel(edge.skipN)} מתוך ${Nlabel(edge.testN)}, ובחר רק את ${Nlabel(edge.keptN)} שנראו לו איכותיות. התוצאה: עברת מ-${fmtR(edge.allR)} ל-${fmtR(edge.keptR)} — שיפור של ${fmtR(delta)}. כלומר אם היית סומך על המנוע, היית מרוויח יותר.`,
                        `The engine filtered ${Nlabel(edge.skipN)} out of ${Nlabel(edge.testN)} and kept only the ${Nlabel(edge.keptN)} it considered high-quality. Result: you went from ${fmtR(edge.allR)} to ${fmtR(edge.keptR)} — an improvement of ${fmtR(delta)}. If you had trusted the engine, you would have made more.`,
                      );
                    }
                    return t(
                      `המנוע סינן ${Nlabel(edge.skipN)} מתוך ${Nlabel(edge.testN)}, אבל דווקא העסקאות שהוא דילג עליהן הרוויחו ${fmtR(delta)}. כלומר במקרה הזה, היית מרוויח יותר אם לא היית סומך עליו — צריך עוד דאטה כדי שילמד אותך טוב יותר.`,
                      `The engine filtered ${Nlabel(edge.skipN)} out of ${Nlabel(edge.testN)}, but the trades it skipped actually earned ${fmtR(delta)}. In this case, you would have made more without it — needs more data to learn you better.`,
                    );
                  })()}
                </p>

                <div style={{ height: 230, direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={edge.equity} margin={{ top: 6, right: 8, bottom: 2, left: -8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="k" tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} tickLine={false} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} tickLine={false} axisLine={{ stroke: C.border }} width={42} />
                      <Tooltip contentStyle={{ background: '#0A1B33', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: MONO, fontSize: 12 }}
                        formatter={(v: number | string, n: string) => [`${Number(v) >= 0 ? '+' : ''}${v}R`, n === 'all' ? t('כל העסקאות', 'all trades') : t('עם המנוע', 'with engine')]} />
                      <ReferenceLine y={0} stroke={C.dim} strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="all" stroke={C.dim} strokeWidth={2} dot={false} name="all" />
                      <Line type="monotone" dataKey="filtered" stroke={C.green} strokeWidth={2.6} dot={false} name="filtered" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ marginTop: 18 }}>
                  <Eyebrow>{t('מה המנוע למד עליך', 'WHAT IT LEARNED ABOUT YOU')}</Eyebrow>
                  <p style={{ fontSize: 13.5, color: C.mut, margin: '6px 0 12px', lineHeight: 1.6 }}>
                    {t(
                      'אלו הדפוסים שהמנוע זיהה — מה מגדיל את הסיכויים שלך להצליח, ומה מקטין אותם:',
                      'These are the patterns the engine detected — what increases your chances of success, and what reduces them:',
                    )}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {edge.drivers.slice(0, 6).map(d => {
                      const positive = d.coef >= 0;
                      const label = lang === 'he' ? d.he : d.en;
                      const verdict = positive
                        ? t('מגדיל לך את הסיכוי להצליח', 'increases your chance of success')
                        : t('מקטין לך את הסיכוי להצליח', 'reduces your chance of success');
                      const color = positive ? C.green : C.red;
                      const icon = positive ? '↑' : '↓';
                      return (
                        <div key={d.key} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px',
                          background: `${color}0D`,
                          border: `1px solid ${color}33`,
                          borderRadius: 10,
                        }}>
                          <div style={{
                            flex: '0 0 28px', height: 28, borderRadius: '50%',
                            background: `${color}22`, color, fontSize: 16, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{icon}</div>
                          <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                            <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: 12, color, marginTop: 2 }}>{verdict}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({ C, label, value, sub, color }: { C: Record<string, string>; label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'rgba(148,197,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: C.mut }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color, margin: '5px 0 3px', direction: 'ltr' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.dim }}>{sub}</div>
    </div>
  );
}
