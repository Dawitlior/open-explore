import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useJournal, type TradingDay } from '@/contexts/JournalContext';

const J = {
  bg: '#05070D',
  accent: { cyan: '#00FFC6', purple: '#7B61FF', gold: '#D4AF37' },
  text: { primary: '#F0F4F8', secondary: '#94A3B8', muted: '#64748B', dim: '#475569' },
  glass: { blur: 'blur(16px)', bg: 'rgba(12, 18, 30, 0.7)', border: '1px solid rgba(100, 220, 255, 0.08)' },
};

interface ArchiveProps {
  onClose: () => void;
}

export const JournalArchive = ({ onClose }: ArchiveProps) => {
  const { allDays, loadDay } = useJournal();
  const [selectedDay, setSelectedDay] = useState<TradingDay | null>(null);

  const formatDate = (d: string) => {
    const date = new Date(d + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSelectDay = async (date: string) => {
    const day = await loadDay(date);
    setSelectedDay(day);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(5, 7, 13, 0.92)',
        backdropFilter: 'blur(20px)',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h2 style={{
              fontSize: 28, fontWeight: 300, color: J.text.primary,
              fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 4,
            }}>
              The Archive
            </h2>
            <p style={{ fontSize: 12, color: J.text.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {allDays.length} sessions recorded
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: J.text.muted, cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {allDays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: J.text.dim }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📜</div>
            <div style={{ fontSize: 14 }}>No sessions recorded yet</div>
          </div>
        ) : selectedDay ? (
          /* ─── Day Detail View ─── */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setSelectedDay(null)} style={{
              padding: '6px 16px', borderRadius: 16, marginBottom: 20,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: J.text.secondary, cursor: 'pointer', fontSize: 12,
            }}>← Back to list</button>

            <div style={{ fontSize: 20, fontWeight: 300, color: J.text.primary, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 24 }}>
              {formatDate(selectedDay.date)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Morning */}
              <div style={{
                padding: 20, borderRadius: 16,
                background: J.glass.bg, backdropFilter: J.glass.blur,
                border: J.glass.border,
              }}>
                <div style={{ fontSize: 10, color: J.accent.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Morning Phase</div>
                {selectedDay.morning ? (
                  <>
                    {selectedDay.morning.chartImage && (
                      <img src={selectedDay.morning.chartImage} alt="Morning Chart" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                    )}
                    <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', marginBottom: 6 }}>Emotions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {selectedDay.morning.emotion.map(e => (
                        <span key={e} style={{ padding: '3px 10px', borderRadius: 12, background: `${J.accent.cyan}12`, border: `1px solid ${J.accent.cyan}20`, fontSize: 10, color: J.accent.cyan }}>{e}</span>
                      ))}
                    </div>
                    {selectedDay.morning.freeWriting && (
                      <>
                        <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', marginBottom: 6 }}>Market Expectations</div>
                        <div style={{ fontSize: 12, color: J.text.secondary, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 12 }}>"{selectedDay.morning.freeWriting}"</div>
                      </>
                    )}
                    <div style={{ fontSize: 10, color: J.text.dim, marginTop: 8 }}>Fear & Greed: <span style={{ color: J.accent.gold, fontWeight: 700 }}>{selectedDay.morning.fearGreed}</span></div>
                  </>
                ) : (
                  <div style={{ color: J.text.dim, fontSize: 12, padding: 20, textAlign: 'center' }}>No morning data</div>
                )}
              </div>

              {/* Evening */}
              <div style={{
                padding: 20, borderRadius: 16,
                background: J.glass.bg, backdropFilter: J.glass.blur,
                border: J.glass.border,
              }}>
                <div style={{ fontSize: 10, color: J.accent.purple, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Evening Phase</div>
                {selectedDay.evening ? (
                  <>
                    {selectedDay.evening.finalChartImage && (
                      <img src={selectedDay.evening.finalChartImage} alt="EOD Chart" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                    )}
                    {selectedDay.evening.biasAccuracy && (
                      <>
                        <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', marginBottom: 6 }}>Bias Assessment</div>
                        <div style={{ fontSize: 12, color: J.text.secondary, lineHeight: 1.6, marginBottom: 12 }}>{selectedDay.evening.biasAccuracy}</div>
                      </>
                    )}
                    {selectedDay.evening.forensicLessons && (
                      <>
                        <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', marginBottom: 6 }}>Lessons</div>
                        <div style={{ fontSize: 12, color: J.text.secondary, lineHeight: 1.6 }}>{selectedDay.evening.forensicLessons}</div>
                      </>
                    )}
                    <div style={{ fontSize: 10, color: J.text.dim, marginTop: 12 }}>
                      Rules Followed: <span style={{ color: selectedDay.evening.rulesFollowed ? '#10b981' : '#ef4444', fontWeight: 700 }}>{selectedDay.evening.rulesFollowed ? 'Yes' : 'No'}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color: J.text.dim, fontSize: 12, padding: 20, textAlign: 'center' }}>No evening data</div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─── Day List ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allDays.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelectDay(day.date)}
                style={{
                  padding: 18, borderRadius: 16, cursor: 'pointer',
                  background: J.glass.bg, backdropFilter: J.glass.blur,
                  border: J.glass.border,
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15, 20, 35, 0.85)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = J.glass.bg; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: day.evening?.completed
                    ? `linear-gradient(135deg, ${J.accent.cyan}20, ${J.accent.purple}15)`
                    : day.morning?.locked
                    ? `rgba(212, 175, 55, 0.08)`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${day.evening?.completed ? J.accent.cyan + '25' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {day.evening?.completed ? '✅' : day.morning?.locked ? '🌅' : '📝'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: J.text.primary }}>{formatDate(day.date)}</div>
                  <div style={{ fontSize: 11, color: J.text.dim, marginTop: 2 }}>
                    {day.evening?.completed ? 'Full session completed' : day.morning?.locked ? 'Morning locked, evening pending' : 'In progress'}
                    {day.morning?.emotion && day.morning.emotion.length > 0 && ` • ${day.morning.emotion.slice(0, 3).join(', ')}`}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: J.text.dim }}>→</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
