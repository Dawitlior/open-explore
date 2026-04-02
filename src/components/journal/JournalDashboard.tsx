import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { MorningRitual, EODReview } from '@/hooks/use-journal-mode';

interface Props {
  isRTL: boolean;
  trades: Trade[];
  morningRituals: MorningRitual[];
  eodReviews: EODReview[];
  onNavigate: (page: string) => void;
}

const GOLD = '#D4AF37';
const SLATE = '#1A1A2E';
const GREEN = '#2D6A4F';
const RED = '#C44536';

const GLASS = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: `1px solid rgba(212,175,55,0.20)`,
  borderRadius: 16,
} as const;

export const JournalDashboard = ({ isRTL, trades, morningRituals, eodReviews, onNavigate }: Props) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMorning = morningRituals.find(r => r.date === todayKey);
  const todayEOD = eodReviews.find(r => r.date === todayKey);

  const todayTrades = useMemo(() => trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }), [trades]);

  const todayPnl = todayTrades.reduce((s, tr) => s + tr.pnl, 0);

  const ritualStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (morningRituals.find(r => r.date === key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [morningRituals]);

  const avgMood = morningRituals.length > 0
    ? (morningRituals.slice(-7).reduce((s, r) => s + r.mood, 0) / Math.min(7, morningRituals.length))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
          {isRTL ? 'היומן שלך' : 'Your Journal'}
        </div>
        <div style={{ fontSize: 14, color: '#8A8A9A' }}>
          {isRTL ? 'מרחב הרפלקציה הפסיכולוגי' : 'Your psychological reflection space'}
        </div>
      </div>

      {/* Stats */}
      <div style={{ ...GLASS, padding: 28, display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: isRTL ? 'רווח/הפסד היום' : "Today's P&L", value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`, color: todayPnl >= 0 ? GREEN : RED },
          { label: isRTL ? 'עסקאות' : 'Trades', value: String(todayTrades.length), color: GOLD },
          { label: isRTL ? 'רצף טקסים' : 'Ritual Streak', value: `${ritualStreak} 🔥`, color: SLATE },
          { label: isRTL ? 'מצב רוח' : 'Mood (7d)', value: avgMood > 0 ? avgMood.toFixed(1) : '—', color: GOLD },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 10, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { id: 'morning-ritual', icon: '🌅', title: isRTL ? 'ניתוח בוקר' : 'Morning Analysis', sub: isRTL ? 'הטיה, אנרגיה, נכסים' : 'Bias, energy, assets', done: !!todayMorning },
          { id: 'eod-vault', icon: '🌙', title: isRTL ? 'רפלקציית ערב' : 'Evening Reflection', sub: isRTL ? 'ניתוח, טילט, שיעורים' : 'Debrief, tilt, lessons', done: !!todayEOD },
        ].map(card => (
          <motion.div key={card.id} whileHover={{ scale: 1.01, y: -2 }} onClick={() => onNavigate(card.id)}
            style={{ ...GLASS, padding: 28, cursor: 'pointer', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span style={{ fontSize: 32 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{card.title}</div>
                <div style={{ fontSize: 11, color: '#8A8A9A' }}>{card.sub}</div>
              </div>
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: 10, textAlign: 'center',
              background: card.done ? 'rgba(45,106,79,0.04)' : `rgba(212,175,55,0.04)`,
              border: `1px solid ${card.done ? 'rgba(45,106,79,0.12)' : 'rgba(212,175,55,0.12)'}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: card.done ? GREEN : GOLD, letterSpacing: '0.05em' }}>
                {card.done ? '✓ Complete' : '⏳ Pending →'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Trades */}
      {todayTrades.length > 0 && (
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 16 }}>
            {isRTL ? 'עסקאות היום' : "TODAY'S TRADES"}
          </div>
          {todayTrades.map(tr => (
            <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 6,
                  background: tr.winLoss === 'Win' ? 'rgba(45,106,79,0.06)' : 'rgba(196,69,54,0.06)',
                  color: tr.winLoss === 'Win' ? GREEN : RED, fontWeight: 700,
                }}>{tr.winLoss}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{tr.coin}</span>
                <span style={{ fontSize: 11, color: '#8A8A9A' }}>{tr.direction}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: tr.pnl >= 0 ? GREEN : RED }}>
                {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
