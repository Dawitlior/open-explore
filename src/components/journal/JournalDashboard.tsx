import { useMemo } from 'react';
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
  onNavigate: (page: string) => void;
}

const GLASS = {
  background: 'rgba(16,13,40,0.6)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
} as const;

export const JournalDashboard = ({ T, isRTL, trades, morningRituals, eodReviews, onNavigate }: Props) => {
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
    const sorted = [...morningRituals].sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (sorted.find(r => r.date === key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [morningRituals]);

  const avgMood = morningRituals.length > 0
    ? (morningRituals.slice(-7).reduce((s, r) => s + r.mood, 0) / Math.min(7, morningRituals.length))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 36, fontWeight: 400, color: '#ede9fe', fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
          {isRTL ? '🧘 ברוך הבא ליומן' : '🧘 Welcome to Your Journal'}
        </div>
        <div style={{ fontSize: 13, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
          {isRTL ? 'מרחב הרפלקציה הפסיכולוגי שלך' : 'Your psychological reflection space'}
        </div>
      </div>

      {/* Stats */}
      <div style={{ ...GLASS, padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: isRTL ? 'רווח/הפסד היום' : "Today's P&L", value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`, color: todayPnl >= 0 ? '#86efac' : '#fb7185' },
          { label: isRTL ? 'עסקאות' : 'Trades', value: String(todayTrades.length), color: '#c4b5fd' },
          { label: isRTL ? 'רצף טקסים' : 'Ritual Streak', value: `${ritualStreak} 🔥`, color: '#a78bfa' },
          { label: isRTL ? 'מצב רוח (7 ימים)' : 'Mood (7d avg)', value: avgMood > 0 ? avgMood.toFixed(1) : '—', color: '#818cf8' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 9, color: '#7c75a8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { id: 'morning-ritual', icon: '🌅', title: isRTL ? 'טקס בוקר' : 'Morning Ritual', sub: isRTL ? 'מוד, אנרגיה, הטיה' : 'Mood, energy, bias', done: !!todayMorning, doneLabel: '✓ Completed', pendingLabel: '⏳ Start Ritual →', doneColor: '#86efac', pendingColor: '#fbbf24' },
          { id: 'eod-vault', icon: '🌙', title: isRTL ? 'כספת סוף יום' : 'EOD Vault', sub: isRTL ? 'ניתוח, טילט, שיעורים' : 'Debrief, tilt, lessons', done: !!todayEOD, doneLabel: '✓ Sealed', pendingLabel: '⏳ Open Vault →', doneColor: '#c4b5fd', pendingColor: '#fbbf24' },
          { id: 'journal-archive', icon: '📚', title: isRTL ? 'ארכיון' : 'Archive', sub: isRTL ? 'היסטוריה + רגש' : 'History + emotion', done: false, doneLabel: '', pendingLabel: `${trades.length} trades • ${morningRituals.length} rituals`, doneColor: '', pendingColor: '#818cf8' },
        ].map(card => (
          <motion.div key={card.id} whileHover={{ scale: 1.01 }} onClick={() => onNavigate(card.id)}
            style={{ ...GLASS, padding: 24, cursor: 'pointer', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#ede9fe', fontFamily: "'Playfair Display', serif" }}>{card.title}</div>
                <div style={{ fontSize: 10, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>{card.sub}</div>
              </div>
            </div>
            <div style={{
              padding: '8px 14px', borderRadius: 10, textAlign: 'center',
              background: card.done ? `${card.doneColor}0F` : `${card.pendingColor}0F`,
              border: `1px solid ${card.done ? card.doneColor : card.pendingColor}25`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: card.done ? card.doneColor : card.pendingColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                {card.done ? card.doneLabel : card.pendingLabel}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Trades */}
      {todayTrades.length > 0 && (
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'עסקאות היום' : "TODAY'S TRADES"}
          </div>
          {todayTrades.map(tr => (
            <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 6,
                  background: tr.winLoss === 'Win' ? 'rgba(134,239,172,0.1)' : 'rgba(251,113,133,0.1)',
                  color: tr.winLoss === 'Win' ? '#86efac' : '#fb7185',
                  fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
                }}>{tr.winLoss}</span>
                <span style={{ fontSize: 14, color: '#ede9fe', fontFamily: "'Playfair Display', serif" }}>{tr.coin}</span>
                <span style={{ fontSize: 11, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>{tr.direction}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: tr.pnl >= 0 ? '#86efac' : '#fb7185' }}>
                {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
