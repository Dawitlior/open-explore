import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from '@/components/trading/TradingUI';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  todayCompleted: boolean;
  todayTradeCount: number;
  todayPnl: number;
  onSave: (data: { debrief: string; lessonsLearned: string; tiltLevel: number; emotionalState: string }) => void;
}

const TILT_LABELS_EN = ['Fully Calm', 'Slight Irritation', 'Moderate Tilt', 'Strong Tilt', 'Full Tilt'];
const TILT_LABELS_HE = ['שלו לחלוטין', 'גירוי קל', 'הטיה בינונית', 'הטיה חזקה', 'הטיה מלאה'];
const EMOTIONS_EN = ['Confident', 'Anxious', 'Frustrated', 'Disciplined', 'Impulsive', 'Calm', 'Greedy', 'Fearful'];
const EMOTIONS_HE = ['בטוח', 'חרד', 'מתוסכל', 'ממושמע', 'אימפולסיבי', 'רגוע', 'חמדן', 'מפוחד'];

export const EODVaultPage = ({ T, isRTL, todayCompleted, todayTradeCount, todayPnl, onSave }: Props) => {
  const [debrief, setDebrief] = useState('');
  const [lessons, setLessons] = useState('');
  const [tilt, setTilt] = useState(1);
  const [emotion, setEmotion] = useState('');
  const [saved, setSaved] = useState(todayCompleted);
  const [vaultAnimation, setVaultAnimation] = useState(false);

  const font = "'Playfair Display', Georgia, serif";
  const tiltLabels = isRTL ? TILT_LABELS_HE : TILT_LABELS_EN;
  const emotionsList = isRTL ? EMOTIONS_HE : EMOTIONS_EN;

  const handleSave = useCallback(() => {
    setVaultAnimation(true);
    onSave({ debrief, lessonsLearned: lessons, tiltLevel: tilt, emotionalState: emotion });
    setTimeout(() => {
      setSaved(true);
      setTimeout(() => setVaultAnimation(false), 2500);
    }, 2200);
  }, [debrief, lessons, tilt, emotion, onSave]);

  // Vault Door Seal Animation
  if (vaultAnimation) {
    return (
      <motion.div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Vault door particles collapsing inward */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const x = Math.cos(angle) * 200;
          const y = Math.sin(angle) * 200;
          return (
            <motion.div
              key={i}
              style={{
                position: 'absolute', width: 4, height: 4, borderRadius: '50%',
                background: T.accent.orange,
              }}
              initial={{ x, y, opacity: 0.8, scale: 1 }}
              animate={{ x: 0, y: 0, opacity: [0.8, 1, 0], scale: [1, 1.5, 0] }}
              transition={{ duration: 1.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}

        {/* Vault seal icon */}
        <motion.div
          style={{ fontSize: 48, position: 'relative', zIndex: 2 }}
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: [3, 0.9, 1], opacity: [0, 1, 1] }}
          transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          🔒
        </motion.div>

        <motion.div
          style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.25em', color: T.accent.orange, marginTop: 16, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
        >
          VAULT SEALED
        </motion.div>

        <motion.div
          style={{ fontSize: 11, color: T.text.dim, marginTop: 8 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          {isRTL ? 'יום המסחר נחתם' : 'Trading day archived'}
        </motion.div>
      </motion.div>
    );
  }

  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 400, color: T.text.primary, fontFamily: font, marginBottom: 8 }}>
            {isRTL ? 'היום נחתם בכספת' : 'Day Sealed in Vault'}
          </div>
          <div style={{ fontSize: 13, color: T.text.muted, fontFamily: font }}>
            {isRTL ? 'הלקחים נשמרו. מחר יום חדש.' : 'Lessons archived. Tomorrow is a new day.'}
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
            {isRTL ? 'סגירת יום' : 'End of Day Vault'}
          </div>
          <div style={{ fontSize: 13, color: T.text.muted, fontFamily: font }}>
            {isRTL ? 'חתום את היום, חלץ לקחים, שחרר' : 'Seal the day, extract lessons, release'}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <GlassCard T={T} style={{ flex: 1, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase' }}>{isRTL ? 'עסקאות היום' : 'Today\'s Trades'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{todayTradeCount}</div>
          </GlassCard>
          <GlassCard T={T} style={{ flex: 1, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase' }}>P&L</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: todayPnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}</div>
          </GlassCard>
        </div>

        {/* Tilt Check */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: font }}>
            {isRTL ? 'בדיקת הטיה' : 'Tilt Check'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setTilt(level)}
                style={{
                  width: 48, height: 48, borderRadius: T.radius.md,
                  border: tilt === level ? `2px solid ${level >= 4 ? T.accent.red : level >= 3 ? T.accent.orange : T.accent.green}` : `1px solid ${T.border.subtle}`,
                  background: tilt === level
                    ? `${level >= 4 ? T.accent.red : level >= 3 ? T.accent.orange : T.accent.green}15`
                    : 'transparent',
                  color: tilt === level
                    ? (level >= 4 ? T.accent.red : level >= 3 ? T.accent.orange : T.accent.green)
                    : T.text.dim,
                  fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: tilt >= 4 ? T.accent.red : tilt >= 3 ? T.accent.orange : T.accent.green, fontFamily: font }}>
            {tiltLabels[tilt - 1]}
          </div>
        </GlassCard>

        {/* Emotional State */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: font }}>
            {isRTL ? 'מצב רגשי' : 'Emotional State'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {emotionsList.map((em, i) => (
              <button
                key={i}
                onClick={() => setEmotion(em)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: emotion === em ? `1px solid ${T.accent.cyan}` : `1px solid ${T.border.subtle}`,
                  background: emotion === em ? `${T.accent.cyan}15` : 'transparent',
                  color: emotion === em ? T.accent.cyan : T.text.secondary,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Post-Market Debrief */}
        <GlassCard T={T} style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: font }}>
            {isRTL ? 'סיכום יום' : 'Post-Market Debrief'}
          </div>
          <textarea
            value={debrief}
            onChange={e => setDebrief(e.target.value)}
            placeholder={isRTL ? 'מה קרה היום? מה עבד? מה לא?' : 'What happened today? What worked? What didn\'t?'}
            style={{
              width: '100%', minHeight: 80, padding: 12,
              background: T.bg.surface, border: `1px solid ${T.border.medium}`,
              borderRadius: T.radius.md, color: T.text.primary,
              fontSize: 13, fontFamily: font, resize: 'vertical',
              lineHeight: 1.6, direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </GlassCard>

        {/* Lessons Learned */}
        <GlassCard T={T} style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: font }}>
            {isRTL ? 'לקחים' : 'Lessons Learned'}
          </div>
          <textarea
            value={lessons}
            onChange={e => setLessons(e.target.value)}
            placeholder={isRTL ? 'מה למדתי היום? מה אעשה אחרת מחר?' : 'What did I learn today? What will I do differently tomorrow?'}
            style={{
              width: '100%', minHeight: 70, padding: 12,
              background: T.bg.surface, border: `1px solid ${T.border.medium}`,
              borderRadius: T.radius.md, color: T.text.primary,
              fontSize: 13, fontFamily: font, resize: 'vertical',
              lineHeight: 1.6, direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </GlassCard>

        {/* Seal Button */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: 14,
            background: `linear-gradient(135deg, ${T.accent.orange}, ${T.accent.red})`,
            border: 'none', borderRadius: T.radius.lg,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: font, letterSpacing: '0.05em',
            transition: 'all 0.3s',
            boxShadow: `0 0 20px ${T.accent.orange}30`,
          }}
        >
          {isRTL ? 'חתום את היום 🔒' : 'Seal the Day 🔒'}
        </button>
      </motion.div>
    </div>
  );
};
