import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from '@/components/trading/TradingUI';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  todayCompleted: boolean;
  onSave: (data: { mood: number; energy: number; intention: string; marketSentiment: number }) => void;
}

const MOODS = ['😣', '😔', '😐', '🙂', '😁'];
const MOOD_LABELS_EN = ['Terrible', 'Low', 'Neutral', 'Good', 'Excellent'];
const MOOD_LABELS_HE = ['נורא', 'נמוך', 'נייטרלי', 'טוב', 'מצוין'];

export const MorningRitualPage = ({ T, isRTL, todayCompleted, onSave }: Props) => {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(5);
  const [intention, setIntention] = useState('');
  const [sentiment, setSentiment] = useState(50);
  const [saved, setSaved] = useState(todayCompleted);
  const [hudAnimation, setHudAnimation] = useState(false);

  const font = "'Playfair Display', Georgia, serif";
  const moodLabels = isRTL ? MOOD_LABELS_HE : MOOD_LABELS_EN;

  const handleSave = useCallback(() => {
    setHudAnimation(true);
    onSave({ mood, energy, intention, marketSentiment: sentiment });
    setTimeout(() => {
      setSaved(true);
      setTimeout(() => setHudAnimation(false), 2000);
    }, 1800);
  }, [mood, energy, intention, sentiment, onSave]);

  // HUD Cinematic Lock Animation
  if (hudAnimation) {
    return (
      <motion.div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Reticle rings */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 80 * i, height: 80 * i, borderRadius: '50%',
              border: `1px solid ${T.accent.cyan}40`,
            }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 0.8, 0.3], rotate: 90 * i }}
            transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
          />
        ))}

        <motion.div
          style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.3em', color: T.accent.cyan, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 1], y: [20, 0, 0] }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          BIAS CONFIRMED
        </motion.div>

        <motion.div
          style={{ fontSize: 12, letterSpacing: '0.2em', color: T.accent.green, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 1], y: [10, 0, 0] }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          RISK DEFINED ✓
        </motion.div>

        <motion.div
          style={{ fontSize: 10, color: T.text.dim, marginTop: 20 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          {isRTL ? 'טקס בוקר נעול' : 'Morning ritual locked'}
        </motion.div>
      </motion.div>
    );
  }

  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧘</div>
          <div style={{ fontSize: 22, fontWeight: 400, color: T.text.primary, fontFamily: font, marginBottom: 8 }}>
            {isRTL ? 'טקס הבוקר נעול' : 'Morning Ritual Locked'}
          </div>
          <div style={{ fontSize: 13, color: T.text.muted, fontFamily: font }}>
            {isRTL ? 'מיקוד, הטיה וסיכון הוגדרו. בהצלחה.' : 'Focus, bias, and risk are defined. Good trading.'}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 300, fontFamily: font, color: T.text.primary, marginBottom: 6 }}>
            {isRTL ? 'טקס בוקר' : 'Morning Ritual'}
          </div>
          <div style={{ fontSize: 13, color: T.text.muted, fontFamily: font }}>
            {isRTL ? 'הגדר את ההטיה, האנרגיה והכוונה לפני שאתה נוגע בשוק' : 'Set your bias, energy, and intention before touching the market'}
          </div>
        </div>

        {/* Mood Tracker */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: font }}>
            {isRTL ? 'מצב רוח' : 'Mood'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {MOODS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setMood(i + 1)}
                style={{
                  fontSize: 28, padding: 8, borderRadius: T.radius.md,
                  border: mood === i + 1 ? `2px solid ${T.accent.cyan}` : `2px solid ${T.border.subtle}`,
                  background: mood === i + 1 ? `${T.accent.cyan}10` : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  transform: mood === i + 1 ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: T.accent.cyan, fontFamily: font }}>
            {moodLabels[mood - 1]}
          </div>
        </GlassCard>

        {/* Energy Level */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: font }}>
              {isRTL ? 'רמת אנרגיה' : 'Energy Level'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{energy}/10</div>
          </div>
          <input
            type="range" min={1} max={10} value={energy}
            onChange={e => setEnergy(+e.target.value)}
            style={{ width: '100%', accentColor: T.accent.cyan }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: T.text.dim }}>⚡ Low</span>
            <span style={{ fontSize: 9, color: T.text.dim }}>🔥 High</span>
          </div>
        </GlassCard>

        {/* Market Sentiment */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: font }}>
              {isRTL ? 'סנטימנט שוק' : 'Market Sentiment'}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: sentiment < 30 ? T.accent.red : sentiment > 70 ? T.accent.green : T.accent.orange,
            }}>
              {sentiment < 30 ? '😨 Fear' : sentiment > 70 ? '🤑 Greed' : '😐 Neutral'}
            </div>
          </div>
          <input
            type="range" min={0} max={100} value={sentiment}
            onChange={e => setSentiment(+e.target.value)}
            style={{ width: '100%', accentColor: sentiment < 30 ? T.accent.red : sentiment > 70 ? T.accent.green : T.accent.orange }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: T.accent.red }}>😨 Extreme Fear</span>
            <span style={{ fontSize: 9, color: T.accent.green }}>🤑 Extreme Greed</span>
          </div>
        </GlassCard>

        {/* Daily Intention */}
        <GlassCard T={T} style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: font }}>
            {isRTL ? 'כוונת יום' : 'Daily Intention'}
          </div>
          <textarea
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder={isRTL ? 'מה הכוונה שלי היום? על מה אני מתמקד?' : 'What is my intention today? What am I focusing on?'}
            style={{
              width: '100%', minHeight: 80, padding: 12,
              background: T.bg.surface, border: `1px solid ${T.border.medium}`,
              borderRadius: T.radius.md, color: T.text.primary,
              fontSize: 13, fontFamily: font, resize: 'vertical',
              lineHeight: 1.6, direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </GlassCard>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!intention.trim()}
          style={{
            width: '100%', padding: 14,
            background: intention.trim()
              ? `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`
              : T.bg.tertiary,
            border: 'none', borderRadius: T.radius.lg,
            color: intention.trim() ? T.bg.primary : T.text.dim,
            fontSize: 14, fontWeight: 700, cursor: intention.trim() ? 'pointer' : 'default',
            fontFamily: font, letterSpacing: '0.05em',
            transition: 'all 0.3s',
            boxShadow: intention.trim() ? `0 0 20px ${T.accent.cyan}30` : 'none',
          }}
        >
          {isRTL ? 'נעל טקס בוקר ✓' : 'Lock Morning Ritual ✓'}
        </button>
      </motion.div>
    </div>
  );
};
