import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { MorningRitual, EODReview } from '@/hooks/use-journal-mode';

interface Props {
  isRTL: boolean;
  trades: Trade[];
  morningRituals: MorningRitual[];
  eodReviews: EODReview[];
  open: boolean;
  onClose: () => void;
}

const GOLD = '#D4AF37';
const SLATE = '#1A1A2E';
const GREEN = '#2D6A4F';
const RED = '#C44536';

export const JournalArchive = ({ isRTL, trades, morningRituals, eodReviews, open, onClose }: Props) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyEntries = useMemo(() => {
    const days: Record<string, {
      date: string; trades: Trade[]; pnl: number; wins: number; losses: number;
      morning?: MorningRitual; eod?: EODReview;
    }> = {};
    trades.forEach(tr => {
      if (!tr.date) return;
      const d = new Date(tr.date.replace(' ', 'T'));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { date: key, trades: [], pnl: 0, wins: 0, losses: 0 };
      days[key].trades.push(tr); days[key].pnl += tr.pnl;
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

  const totalPnl = dailyEntries.reduce((s, d) => s + d.pnl, 0);
  const totalTrades = dailyEntries.reduce((s, d) => s + d.trades.length, 0);
  const totalWins = dailyEntries.reduce((s, d) => s + d.wins, 0);
  const winRate = totalTrades > 0 ? (totalWins / totalTrades * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(250,248,245,0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            overflow: 'auto',
            display: 'flex', justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 900 }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", margin: 0 }}>
                  {isRTL ? '📚 ארכיון' : '📚 Archive'}
                </h2>
                <div style={{ fontSize: 12, color: '#8A8A9A', marginTop: 4 }}>
                  {isRTL ? 'היסטוריית מסחר + רגש' : 'Trading + Emotion History'}
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.04)', border: 'none',
                color: SLATE, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Stats Strip */}
            <div style={{
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(40px)',
              border: `1px solid rgba(212,175,55,0.20)`, borderRadius: 16,
              padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
              marginBottom: 24,
            }}>
              {[
                { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? GREEN : RED },
                { label: 'Total Trades', value: String(totalTrades), color: GOLD },
                { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: GREEN },
                { label: 'Trading Days', value: String(dailyEntries.filter(d => d.trades.length > 0).length), color: SLATE },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 9, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Daily Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dailyEntries.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#8A8A9A' }}>
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
                  <motion.div key={day.date} layout
                    onClick={() => setSelectedDate(isExpanded ? null : day.date)}
                    style={{
                      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(40px)',
                      border: `1px solid ${isExpanded ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.12)'}`,
                      borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", minWidth: 90 }}>
                          {dateDisplay}
                        </span>
                        {day.morning && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(45,106,79,0.05)', color: GREEN, fontWeight: 600 }}>🌅</span>}
                        {day.eod && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `rgba(212,175,55,0.06)`, color: GOLD, fontWeight: 600 }}>🌙</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {day.trades.length > 0 && (
                          <>
                            <span style={{ fontSize: 11, color: '#8A8A9A' }}>{day.trades.length} trades</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: day.pnl >= 0 ? GREEN : RED }}>
                              {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(2)}
                            </span>
                          </>
                        )}
                        {day.morning && <span style={{ fontSize: 11, color: GOLD }}>😊 {day.morning.mood}/10</span>}
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 16 }}>
                        {day.morning && (
                          <div style={{ marginBottom: 14, padding: 14, background: 'rgba(0,0,0,0.01)', borderRadius: 10 }}>
                            <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Morning Ritual</div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#4A4A5A' }}>
                              <span>Mood: {day.morning.mood}/10</span>
                              <span>Energy: {day.morning.energy}/10</span>
                              <span>Sentiment: {day.morning.marketSentiment}</span>
                            </div>
                            {day.morning.intention && (
                              <div style={{ fontSize: 12, color: SLATE, marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{day.morning.intention}</div>
                            )}
                          </div>
                        )}
                        {day.trades.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trades</div>
                            {day.trades.map(tr => (
                              <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: 11 }}>
                                <span style={{ color: '#4A4A5A' }}>{tr.coin} {tr.direction}</span>
                                <span style={{ color: tr.pnl >= 0 ? GREEN : RED, fontWeight: 600 }}>
                                  {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)} ({tr.returnR >= 0 ? '+' : ''}{tr.returnR.toFixed(2)}R)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {day.eod && (
                          <div style={{ padding: 14, background: 'rgba(0,0,0,0.01)', borderRadius: 10 }}>
                            <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>EOD Review</div>
                            <div style={{ fontSize: 11, color: '#4A4A5A', marginBottom: 4 }}>Tilt: {day.eod.tiltLevel}/5 • {day.eod.emotionalState}</div>
                            {day.eod.debrief && <div style={{ fontSize: 12, color: SLATE, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{day.eod.debrief}</div>}
                            {day.eod.lessonsLearned && <div style={{ fontSize: 12, color: GOLD, marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>📖 {day.eod.lessonsLearned}</div>}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
