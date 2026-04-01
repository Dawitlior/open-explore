import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import type { MorningRitual, EODReview } from '@/hooks/use-journal-mode';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  morningRituals: MorningRitual[];
  eodReviews: EODReview[];
}

const GLASS = {
  background: 'rgba(16,13,40,0.6)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
} as const;

export const JournalArchive = ({ T, isRTL, trades, morningRituals, eodReviews }: Props) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build daily archive entries
  const dailyEntries = useMemo(() => {
    const days: Record<string, {
      date: string;
      trades: Trade[];
      pnl: number;
      wins: number;
      losses: number;
      morning?: MorningRitual;
      eod?: EODReview;
    }> = {};

    trades.forEach(tr => {
      if (!tr.date) return;
      const d = new Date(tr.date.replace(' ', 'T'));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { date: key, trades: [], pnl: 0, wins: 0, losses: 0 };
      days[key].trades.push(tr);
      days[key].pnl += tr.pnl;
      if (tr.winLoss === 'Win') days[key].wins++;
      if (tr.winLoss === 'Loss') days[key].losses++;
    });

    morningRituals.forEach(r => {
      if (!days[r.date]) days[r.date] = { date: r.date, trades: [], pnl: 0, wins: 0, losses: 0 };
      days[r.date].morning = r;
    });

    eodReviews.forEach(r => {
      if (!days[r.date]) days[r.date] = { date: r.date, trades: [], pnl: 0, wins: 0, losses: 0 };
      days[r.date].eod = r;
    });

    return Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
  }, [trades, morningRituals, eodReviews]);

  // Stats strip
  const totalPnl = dailyEntries.reduce((s, d) => s + d.pnl, 0);
  const totalTrades = dailyEntries.reduce((s, d) => s + d.trades.length, 0);
  const totalWins = dailyEntries.reduce((s, d) => s + d.wins, 0);
  const winRate = totalTrades > 0 ? (totalWins / totalTrades * 100) : 0;
  const avgMood = morningRituals.length > 0
    ? morningRituals.reduce((s, r) => s + r.mood, 0) / morningRituals.length
    : 0;

  const selected = selectedDate ? dailyEntries.find(d => d.date === selectedDate) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 32, fontWeight: 400, color: '#ede9fe', fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
          {isRTL ? '📚 ארכיון משולב' : '📚 Integrated Archive'}
        </h2>
        <div style={{ fontSize: 12, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
          {isRTL ? 'היסטוריית מסחר + רגש' : 'Trading + Emotion History'}
        </div>
      </div>

      {/* Stats Strip */}
      <div style={{
        ...GLASS, padding: 20,
        display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[
          { label: isRTL ? 'סה"כ רווח/הפסד' : 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? '#86efac' : '#fb7185' },
          { label: isRTL ? 'סה"כ עסקאות' : 'Total Trades', value: String(totalTrades), color: '#c4b5fd' },
          { label: isRTL ? 'אחוז הצלחה' : 'Win Rate', value: `${winRate.toFixed(1)}%`, color: '#818cf8' },
          { label: isRTL ? 'מצב רוח ממוצע' : 'Avg Mood', value: avgMood > 0 ? `${avgMood.toFixed(1)}/10` : '—', color: '#a78bfa' },
          { label: isRTL ? 'ימי מסחר' : 'Trading Days', value: String(dailyEntries.filter(d => d.trades.length > 0).length), color: '#e879f9' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 9, color: '#7c75a8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: "'IBM Plex Mono', monospace" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dailyEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'אין נתונים עדיין' : 'No data yet'}
          </div>
        )}
        {dailyEntries.map(day => {
          const isExpanded = selectedDate === day.date;
          const dateDisplay = new Date(day.date + 'T12:00:00').toLocaleDateString(
            isRTL ? 'he-IL' : 'en-US',
            { weekday: 'short', month: 'short', day: 'numeric' }
          );
          return (
            <motion.div
              key={day.date}
              layout
              onClick={() => setSelectedDate(isExpanded ? null : day.date)}
              style={{
                ...GLASS, padding: 18, cursor: 'pointer',
                borderColor: isExpanded ? 'rgba(196,181,253,0.15)' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#ede9fe', fontFamily: "'Playfair Display', serif", minWidth: 90 }}>
                    {dateDisplay}
                  </span>
                  {/* Ritual badges */}
                  {day.morning && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(134,239,172,0.08)', color: '#86efac', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                      🌅 Ritual
                    </span>
                  )}
                  {day.eod && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(196,181,253,0.08)', color: '#c4b5fd', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                      🌙 Vault
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {day.trades.length > 0 && (
                    <>
                      <span style={{ fontSize: 11, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {day.trades.length} {isRTL ? 'עסקאות' : 'trades'}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                        color: day.pnl >= 0 ? '#86efac' : '#fb7185',
                      }}>
                        {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(2)}
                      </span>
                    </>
                  )}
                  {day.morning && (
                    <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: "'IBM Plex Mono', monospace" }}>
                      😊 {day.morning.mood}/10
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}
                >
                  {day.morning && (
                    <div style={{ marginBottom: 14, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Morning Ritual
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#a5a0d0', fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span>Mood: {day.morning.mood}/10</span>
                        <span>Energy: {day.morning.energy}/10</span>
                        <span>Sentiment: {day.morning.marketSentiment}</span>
                      </div>
                      {day.morning.intention && (
                        <div style={{ fontSize: 12, color: '#ede9fe', marginTop: 8, lineHeight: 1.6, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'pre-wrap' }}>
                          {day.morning.intention}
                        </div>
                      )}
                    </div>
                  )}

                  {day.trades.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Trades
                      </div>
                      {day.trades.map(tr => (
                        <div key={tr.id} style={{
                          display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          <span style={{ color: '#a5a0d0' }}>{tr.coin} {tr.direction}</span>
                          <span style={{ color: tr.pnl >= 0 ? '#86efac' : '#fb7185', fontWeight: 600 }}>
                            {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)} ({tr.returnR >= 0 ? '+' : ''}{tr.returnR.toFixed(2)}R)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {day.eod && (
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 700, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        EOD Review
                      </div>
                      <div style={{ fontSize: 11, color: '#a5a0d0', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                        Tilt: {day.eod.tiltLevel}/5 • {day.eod.emotionalState}
                      </div>
                      {day.eod.debrief && (
                        <div style={{ fontSize: 12, color: '#ede9fe', lineHeight: 1.6, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'pre-wrap' }}>
                          {day.eod.debrief}
                        </div>
                      )}
                      {day.eod.lessonsLearned && (
                        <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 6, lineHeight: 1.6, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'pre-wrap' }}>
                          📖 {day.eod.lessonsLearned}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
