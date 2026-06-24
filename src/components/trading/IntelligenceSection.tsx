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
const pct = (v: number) => `${Math.round(v * 100)}%`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTheme = any;

export default function IntelligenceSection({ trades, T, enabled }: { trades: Trade[]; T: AnyTheme; enabled: boolean }) {
  const { t, isRTL } = useLang();
  const lang: 'he' | 'en' = isRTL ? 'he' : 'en';

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
          {t('מבוסס על', 'Based on')} <b style={{ color: C.text }}>{seg.totalN}</b> {t('עסקאות', 'trades')} ·{' '}
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
          <p style={{ fontSize: 15, lineHeight: 1.85, color: C.text, margin: '6px 0 16px' }}>{seg.narrative}</p>
          <div style={{ direction: 'ltr' }}>
            {seg.byDow.map(s => {
              const maxAbs = Math.max(...seg.byDow.map(x => Math.abs(x.expectancy)), 0.01);
              const w = Math.min(100, Math.abs(s.expectancy) / maxAbs * 100);
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', opacity: s.verdict === 'gray' || s.verdict === 'insufficient' ? 0.5 : 1 }}>
                  <div style={{ flex: '0 0 70px', textAlign: isRTL ? 'right' : 'left', fontSize: 12.5, color: C.text }}>{s.label}</div>
                  <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${w}%`, background: verdictColor(s.verdict), borderRadius: 5 }} />
                  </div>
                  <div style={{ flex: '0 0 96px', fontFamily: MONO, fontSize: 11.5, color: verdictColor(s.verdict), textAlign: 'left' }}>
                    {fmtR(s.expectancy)} · n={s.n}
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
                  `צריך לפחות 30 עסקאות לאימון אמין (כרגע ${seg.totalN}). ככל שתעלה עוד טריידים, המנוע ילמד אותך טוב יותר.`,
                  `Need at least 30 trades for reliable training (currently ${seg.totalN}). The more trades you add, the better it learns you.`,
                )}
              </p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, margin: '12px 0 16px' }}>
                  <Stat C={C} label={t('TEST AUC · out-of-sample', 'TEST AUC · out-of-sample')} value={edge.testAUC.toFixed(3)} color={C.cyan}
                    sub={t(`train ${edge.trainAUC.toFixed(3)} — לומד, לא משנן`, `train ${edge.trainAUC.toFixed(3)} — learns, not memorizes`)} />
                  <Stat C={C} label={t('סף · נלמד לבד', 'threshold · self-tuned')} value={edge.threshold.toFixed(2)} color={C.purple} sub={t('לא קודד ביד', 'not hand-coded')} />
                  <Stat C={C} label={t('R בלי המנוע', 'R without engine')} value={fmtR(edge.allR)} color={edge.allR >= 0 ? C.green : C.red} sub={`${fmtR(edge.expAll)} · n=${edge.testN}`} />
                  <Stat C={C} label={t('R עם המנוע', 'R with engine')} value={fmtR(edge.keptR)} color={edge.keptR >= 0 ? C.green : C.red} sub={`${fmtR(edge.expKept)} · n=${edge.keptN}`} />
                </div>

                <div style={{ height: 230, direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={edge.equity} margin={{ top: 6, right: 8, bottom: 2, left: -8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="k" tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} tickLine={false} axisLine={{ stroke: C.border }} />
                      <YAxis tick={{ fill: C.dim, fontSize: 10, fontFamily: MONO }} tickLine={false} axisLine={{ stroke: C.border }} width={42} />
                      <Tooltip contentStyle={{ background: '#0A1B33', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: MONO, fontSize: 12 }}
                        formatter={(v: number | string, n: string) => [`${Number(v) >= 0 ? '+' : ''}${v}R`, n === 'all' ? t('כל העסקאות', 'all trades') : t('מסונן ע״י המנוע', 'engine-filtered')]} />
                      <ReferenceLine y={0} stroke={C.dim} strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="all" stroke={C.dim} strokeWidth={2} dot={false} name="all" />
                      <Line type="monotone" dataKey="filtered" stroke={C.green} strokeWidth={2.6} dot={false} name="filtered" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p style={{ fontFamily: MONO, fontSize: 13, color: C.text, lineHeight: 1.7, margin: '8px 0 16px' }}>
                  {t(
                    `המנוע דילג על ${edge.skipN} עסקאות (שלא ראה) ששוות נטו ${fmtR(edge.diff)} — והפך ${fmtR(edge.allR)} ל-${fmtR(edge.keptR)}.`,
                    `The engine skipped ${edge.skipN} unseen trades worth net ${fmtR(edge.diff)} — turning ${fmtR(edge.allR)} into ${fmtR(edge.keptR)}.`,
                  )}
                </p>

                <Eyebrow>{t('מה המנוע למד עליך · DRIVERS', 'WHAT IT LEARNED · DRIVERS')}</Eyebrow>
                <div style={{ direction: 'ltr', marginTop: 8 }}>
                  {edge.drivers.slice(0, 6).map(d => {
                    const w = Math.min(100, Math.abs(d.coef) / (Math.abs(edge.drivers[0].coef) || 1) * 100);
                    const posD = d.coef >= 0;
                    return (
                      <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
                        <div style={{ flex: '0 0 190px', textAlign: isRTL ? 'right' : 'left', fontSize: 12, color: C.text }}>{lang === 'he' ? d.he : d.en}</div>
                        <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, bottom: 0, [posD ? 'left' : 'right']: 0, width: `${w}%`, background: posD ? C.green : C.red, borderRadius: 5 } as React.CSSProperties} />
                        </div>
                        <div style={{ flex: '0 0 60px', fontFamily: MONO, fontSize: 11.5, color: posD ? C.green : C.red, textAlign: 'left' }}>
                          {posD ? '+' : '−'}{Math.abs(d.coef).toFixed(3)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {edge.changepoint && (
                  <div style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.28)', borderRadius: 12, padding: '12px 14px', marginTop: 16 }}>
                    <Eyebrow color={C.orange}>{t('שינוי מבני · CHANGEPOINT', 'STRUCTURAL SHIFT · CHANGEPOINT')}</Eyebrow>
                    <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: '8px 0 0' }}>
                      {t(
                        `משהו השתנה ב-trading שלך סביב ${new Date(edge.changepoint.dateISO).toLocaleDateString('he-IL')} — התוחלת צנחה מ-${fmtR(edge.changepoint.before)} ל-${fmtR(edge.changepoint.after)}. המנוע מצא את זה לבד; שווה לבדוק מה השתנה אז.`,
                        `Something shifted around ${new Date(edge.changepoint.dateISO).toLocaleDateString('en-US')} — expectancy dropped from ${fmtR(edge.changepoint.before)} to ${fmtR(edge.changepoint.after)}. The engine found it on its own; worth checking what changed then.`,
                      )}
                    </p>
                  </div>
                )}
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
