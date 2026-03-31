import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import type { MorningRitual, EODReview } from '@/hooks/use-journal-mode';
import { GlassCard } from '@/components/trading/TradingUI';
import { calculateCorrelations } from '@/lib/correlation-engine';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  morningRituals: MorningRitual[];
  eodReviews: EODReview[];
  onNavigate: (page: string) => void;
}

export const JournalDashboard = ({ T, isRTL, trades, morningRituals, eodReviews, onNavigate }: Props) => {
  const font = "'Playfair Display', Georgia, serif";
  const mono = "'JetBrains Mono', monospace";

  const correlations = useMemo(
    () => calculateCorrelations(trades, morningRituals, eodReviews),
    [trades, morningRituals, eodReviews]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayMorning = morningRituals.find(r => r.date === today);
  const todayEOD = eodReviews.find(r => r.date === today);
  const recentRituals = morningRituals.slice(-7);
  const recentEODs = eodReviews.slice(-7);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 300, fontFamily: font, color: T.text.primary, marginBottom: 6 }}>
            {isRTL ? 'יומן פסיכולוגי' : 'Psychological Journal'}
          </div>
          <div style={{ fontSize: 14, color: T.text.muted, fontFamily: font }}>
            {isRTL ? 'תודעה, משמעת, אבולוציה' : 'Awareness, Discipline, Evolution'}
          </div>
        </div>

        {/* Today's Status */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <GlassCard T={T} onClick={() => !todayMorning && onNavigate('morning-ritual')} style={{ flex: 1, minWidth: 200, padding: 18, cursor: todayMorning ? 'default' : 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>{todayMorning ? '✅' : '🌅'}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text.primary, fontFamily: font }}>
                  {isRTL ? 'טקס בוקר' : 'Morning Ritual'}
                </div>
                <div style={{ fontSize: 10, color: todayMorning ? T.accent.green : T.accent.orange }}>
                  {todayMorning ? (isRTL ? 'הושלם ✓' : 'Completed ✓') : (isRTL ? 'טרם הושלם' : 'Not completed')}
                </div>
                {todayMorning && (
                  <div style={{ fontSize: 9, color: T.text.dim, marginTop: 2 }}>
                    Energy: {todayMorning.energy}/10 • Mood: {todayMorning.mood}/5
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard T={T} onClick={() => !todayEOD && onNavigate('eod-vault')} style={{ flex: 1, minWidth: 200, padding: 18, cursor: todayEOD ? 'default' : 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>{todayEOD ? '🔒' : '🌙'}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text.primary, fontFamily: font }}>
                  {isRTL ? 'סגירת יום' : 'EOD Review'}
                </div>
                <div style={{ fontSize: 10, color: todayEOD ? T.accent.green : T.accent.orange }}>
                  {todayEOD ? (isRTL ? 'הושלם ✓' : 'Completed ✓') : (isRTL ? 'טרם הושלם' : 'Not completed')}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Correlation Intelligence */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: T.accent.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 1, background: T.accent.cyan, display: 'inline-block' }} />
            {isRTL ? 'מנוע קורלציות' : 'CORRELATION ENGINE'}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Emotional Alpha */}
            <GlassCard T={T} style={{ flex: 1, minWidth: 250, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.purple, marginBottom: 10, fontFamily: font }}>
                {isRTL ? 'אלפא רגשי' : 'Emotional Alpha'}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>😴 Tired</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: correlations.emotionalAlpha.tiredLossR < 0 ? T.accent.red : T.accent.green, fontFamily: mono }}>
                    {correlations.emotionalAlpha.tiredLossR.toFixed(2)}R
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>😰 Stressed</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: correlations.emotionalAlpha.stressedLossR < 0 ? T.accent.red : T.accent.green, fontFamily: mono }}>
                    {correlations.emotionalAlpha.stressedLossR.toFixed(2)}R
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>😌 Calm</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: correlations.emotionalAlpha.calmGainR >= 0 ? T.accent.green : T.accent.red, fontFamily: mono }}>
                    {correlations.emotionalAlpha.calmGainR.toFixed(2)}R
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: T.text.muted, lineHeight: 1.5 }}>{correlations.emotionalAlpha.description}</div>
            </GlassCard>

            {/* Discipline Correlation */}
            <GlassCard T={T} style={{ flex: 1, minWidth: 250, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.cyan, marginBottom: 10, fontFamily: font }}>
                {isRTL ? 'קורלציית משמעת' : 'Discipline Correlation'}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>With Ritual</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.accent.green, fontFamily: mono }}>
                    {correlations.disciplineCorrelation.withRitualAvgR.toFixed(2)}R
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>Without</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.accent.red, fontFamily: mono }}>
                    {correlations.disciplineCorrelation.withoutRitualAvgR.toFixed(2)}R
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>Impact</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: correlations.disciplineCorrelation.ritualImpact >= 0 ? T.accent.green : T.accent.red, fontFamily: mono }}>
                    {correlations.disciplineCorrelation.ritualImpact > 0 ? '+' : ''}{correlations.disciplineCorrelation.ritualImpact.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: T.text.muted, lineHeight: 1.5 }}>{correlations.disciplineCorrelation.description}</div>
            </GlassCard>

            {/* Leak Detection */}
            <GlassCard T={T} style={{ flex: 1, minWidth: 250, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.orange, marginBottom: 10, fontFamily: font }}>
                {isRTL ? 'זיהוי דליפות' : 'Leak Detection'}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>Worst Asset</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.accent.red, fontFamily: mono }}>
                    {correlations.leakDetection.worstAsset.name}
                  </div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>{correlations.leakDetection.worstAsset.lossR.toFixed(1)}R</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>Worst Day</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.accent.red, fontFamily: mono }}>
                    {correlations.leakDetection.worstDay.name}
                  </div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>{correlations.leakDetection.worstDay.avgR.toFixed(2)}R avg</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>High Dev</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.accent.orange, fontFamily: mono }}>
                    {correlations.leakDetection.highDeviationTrades}
                  </div>
                  <div style={{ fontSize: 9, color: T.text.dim }}>trades</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: T.text.muted, lineHeight: 1.5 }}>{correlations.leakDetection.description}</div>
            </GlassCard>
          </div>
        </div>

        {/* Recent Rituals Timeline */}
        <GlassCard T={T} style={{ marginBottom: 18, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary, marginBottom: 12, fontFamily: font }}>
            {isRTL ? 'היסטוריית טקסים' : 'Ritual History'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const key = d.toISOString().slice(0, 10);
              const hasMorning = morningRituals.some(r => r.date === key && r.completed);
              const hasEOD = eodReviews.some(r => r.date === key && r.completed);
              const dayLabel = d.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short' });
              return (
                <div key={i} style={{ flex: 1, minWidth: 60, textAlign: 'center', padding: 8, borderRadius: T.radius.md, background: (hasMorning && hasEOD) ? `${T.accent.green}10` : hasMorning || hasEOD ? `${T.accent.orange}10` : `${T.accent.red}08`, border: `1px solid ${(hasMorning && hasEOD) ? T.accent.green : hasMorning || hasEOD ? T.accent.orange : T.accent.red}20` }}>
                  <div style={{ fontSize: 9, color: T.text.dim }}>{dayLabel}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {hasMorning ? '🌅' : '○'} {hasEOD ? '🌙' : '○'}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
