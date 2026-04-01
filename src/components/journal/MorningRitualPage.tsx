import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  todayCompleted: boolean;
  onSave: (data: { mood: number; energy: number; intention: string; marketSentiment: number }) => Promise<any>;
}

const GLASS = {
  background: 'rgba(16,13,40,0.6)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
} as const;

const CHECKLIST_ITEMS = [
  { icon: '☕', label: 'Pre-market structure review', labelHe: 'סקירת מבנה לפני השוק' },
  { icon: '📊', label: 'HTF bias confirmed', labelHe: 'הטיה ב-HTF אושרה' },
  { icon: '🗺', label: 'Key levels mapped', labelHe: 'רמות מפתח מופו' },
  { icon: '🔍', label: 'Setups identified', labelHe: 'סטאפים זוהו' },
  { icon: '🛡', label: 'Risk defined', labelHe: 'סיכון מוגדר' },
  { icon: '❌', label: 'No-trade zones set', labelHe: 'אזורי אל-מסחר נקבעו' },
  { icon: '✅', label: 'Execution rules confirmed', labelHe: 'כללי ביצוע אושרו' },
  { icon: '🧘', label: 'Mindset calibrated', labelHe: 'מנטליות מכוילת' },
];

const MARKET_SECTIONS = [
  { key: 'btc', label: 'Bitcoin (BTC)', labelHe: 'ביטקוין (BTC)', icon: '₿' },
  { key: 'total3', label: 'Total 3 (Altcoins)', labelHe: 'Total 3 (אלטים)', icon: '📈' },
  { key: 'dominance', label: 'BTC Dominance', labelHe: 'דומיננטיות BTC', icon: '👑' },
  { key: 'macro', label: 'Macro / DXY', labelHe: 'מאקרו / DXY', icon: '🌍' },
];

export const MorningRitualPage = ({ T, isRTL, todayCompleted, onSave }: Props) => {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [clarity, setClarity] = useState('');
  const [sentiment, setSentiment] = useState(50);
  const [checklist, setChecklist] = useState<boolean[]>(Array(8).fill(false));
  const [marketNotes, setMarketNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hudActive, setHudActive] = useState(false);

  const allChecked = checklist.every(Boolean);
  const checkCount = checklist.filter(Boolean).length;

  const handleSave = useCallback(async () => {
    setSaving(true);
    const intention = [
      clarity,
      ...Object.entries(marketNotes).filter(([, v]) => v.trim()).map(([k, v]) => `[${k.toUpperCase()}] ${v}`),
    ].filter(Boolean).join('\n');
    await onSave({ mood, energy, intention, marketSentiment: sentiment });
    setSaving(false);
    setHudActive(true);
    setTimeout(() => { setHudActive(false); setLocked(true); }, 3500);
  }, [mood, energy, clarity, sentiment, marketNotes, onSave]);

  const toggleCheck = (i: number) => {
    setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const fgColor = sentiment <= 25 ? '#ef4444' : sentiment <= 45 ? '#f97316' : sentiment <= 55 ? '#eab308' : sentiment <= 75 ? '#22c55e' : '#10b981';
  const fgLabel = sentiment <= 25 ? 'Extreme Fear' : sentiment <= 45 ? 'Fear' : sentiment <= 55 ? 'Neutral' : sentiment <= 75 ? 'Greed' : 'Extreme Greed';

  if (todayCompleted || locked) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🌅</div>
          <div style={{ fontSize: 28, fontWeight: 400, color: '#c4b5fd', fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            {isRTL ? 'הטקס הושלם' : 'Ritual Complete'}
          </div>
          <div style={{ fontSize: 13, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'הנחיות הבוקר ננעלו. מוכנות חכמה פעילה.' : 'Morning directives locked. Smart readiness active.'}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, marginTop: 24, background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.15)' }}>
            <span style={{ color: '#86efac', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>BIAS CONFIRMED ✓</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* HUD Lock Animation */}
      <AnimatePresence>
        {hudActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,6,20,0.95)', backdropFilter: 'blur(30px)' }}>
            {[1, 2, 3].map(i => (
              <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1], opacity: [0, 0.5, 0.15] }}
                transition={{ duration: 1.2, delay: i * 0.15 }}
                style={{ position: 'absolute', width: 120 * i, height: 120 * i, borderRadius: '50%', border: '1px solid rgba(196,181,253,0.2)' }} />
            ))}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
                style={{ fontSize: 28, fontWeight: 700, color: '#86efac', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 30px rgba(134,239,172,0.5)', marginBottom: 16 }}>
                BIAS CONFIRMED
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                style={{ fontSize: 16, color: '#c4b5fd', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.15em' }}>
                LEVELS MAPPED • RISK DEFINED
              </motion.div>
              <motion.div initial={{ width: 0 }} animate={{ width: 200 }} transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c4b5fd, transparent)', margin: '20px auto 0' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 400, color: '#ede9fe', fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
            {isRTL ? '🌅 טקס הבוקר' : '🌅 Morning Ritual'}
          </h2>
          <div style={{ fontSize: 12, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'הכן את המוח, הגדר את ההטיה, נעל את הכוונה.' : 'Prepare the mind, define the bias, lock the intention.'}
          </div>
        </div>

        {/* PRE-MARKET MINDSET */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'מנטליות קדם-שוק' : 'PRE-MARKET MINDSET'}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#a5a0d0', fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'מצב רוח' : 'Mood'}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#c4b5fd', fontFamily: "'IBM Plex Mono', monospace" }}>{mood}/10</span>
            </div>
            <input type="range" min={1} max={10} value={mood} onChange={e => setMood(Number(e.target.value))} style={{ width: '100%', accentColor: '#c4b5fd' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#5b5580', marginTop: 4 }}>
              <span>{isRTL ? 'רע' : 'Bad'}</span><span>{isRTL ? 'מצוין' : 'Excellent'}</span>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#a5a0d0', fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'רמת אנרגיה' : 'Energy Level'}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#818cf8', fontFamily: "'IBM Plex Mono', monospace" }}>{energy}/10</span>
            </div>
            <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))} style={{ width: '100%', accentColor: '#818cf8' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#a5a0d0', marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              {isRTL ? 'הערות בהירות / כוונה' : 'Clarity Notes / Intention'}
            </div>
            <textarea value={clarity} onChange={e => setClarity(e.target.value)}
              placeholder={isRTL ? 'מה הכוונה שלך להיום?' : 'What is your intention for today?'}
              style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#ede9fe', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", resize: 'vertical', outline: 'none', direction: isRTL ? 'rtl' : 'ltr' }} />
          </div>
        </div>

        {/* FEAR & GREED GAUGE */}
        <div style={{ ...GLASS, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'מד תחושת שוק' : 'MARKET SENTIMENT GAUGE'}
          </div>
          <div style={{ position: 'relative', width: 220, height: 130, margin: '0 auto 16px' }}>
            <svg width="220" height="130" viewBox="0 0 220 130">
              <defs>
                <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" /><stop offset="25%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" /><stop offset="75%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path d="M20 120 A90 90 0 0 1 200 120" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeLinecap="round" />
              <path d="M20 120 A90 90 0 0 1 200 120" fill="none" stroke="url(#fgGrad)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(sentiment / 100) * 283} 283`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              <text x="110" y="95" textAnchor="middle" fill={fgColor} fontSize="32" fontWeight="700" fontFamily="'IBM Plex Mono', monospace">{sentiment}</text>
              <text x="110" y="115" textAnchor="middle" fill="#7c75a8" fontSize="10" fontFamily="'IBM Plex Mono', monospace">{fgLabel}</text>
            </svg>
          </div>
          <input type="range" min={0} max={100} value={sentiment} onChange={e => setSentiment(Number(e.target.value))} style={{ width: '80%', accentColor: fgColor }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', margin: '6px auto 0', fontSize: 9, color: '#5b5580' }}>
            <span>Extreme Fear</span><span>Extreme Greed</span>
          </div>
        </div>

        {/* STRATEGIC CONTEXT */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'הקשר אסטרטגי' : 'STRATEGIC CONTEXT'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {MARKET_SECTIONS.map(sec => (
              <div key={sec.key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{sec.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#a5a0d0', fontFamily: "'Playfair Display', serif" }}>{isRTL ? sec.labelHe : sec.label}</span>
                </div>
                <textarea value={marketNotes[sec.key] || ''} onChange={e => setMarketNotes(prev => ({ ...prev, [sec.key]: e.target.value }))}
                  placeholder={isRTL ? 'הערות...' : 'Notes...'} rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', color: '#ede9fe', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", resize: 'none', outline: 'none', direction: isRTL ? 'rtl' : 'ltr' }} />
              </div>
            ))}
          </div>
        </div>

        {/* EXECUTION CHECKLIST */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
              {isRTL ? 'רשימת ביצוע' : 'EXECUTION CHECKLIST'}
            </div>
            <div style={{ fontSize: 11, color: allChecked ? '#86efac' : '#7c75a8', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{checkCount}/8</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHECKLIST_ITEMS.map((item, i) => (
              <motion.button key={i} onClick={() => toggleCheck(i)} whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: checklist[i] ? 'rgba(134,239,172,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${checklist[i] ? 'rgba(134,239,172,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: isRTL ? 'right' : 'left', transition: 'all 0.2s',
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${checklist[i] ? '#86efac' : 'rgba(255,255,255,0.15)'}`,
                  background: checklist[i] ? 'rgba(134,239,172,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                }}>
                  {checklist[i] && <span style={{ color: '#86efac', fontSize: 13, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{
                  fontSize: 13, color: checklist[i] ? '#86efac' : '#a5a0d0', fontFamily: "'Playfair Display', serif",
                  textDecoration: checklist[i] ? 'line-through' : 'none', opacity: checklist[i] ? 0.7 : 1, transition: 'all 0.2s',
                }}>{isRTL ? item.labelHe : item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* SAVE */}
        <motion.button onClick={handleSave} disabled={saving || !allChecked}
          whileHover={allChecked ? { scale: 1.01 } : {}} whileTap={allChecked ? { scale: 0.98 } : {}}
          style={{
            width: '100%', padding: '16px 24px',
            background: allChecked ? 'linear-gradient(135deg, rgba(196,181,253,0.15), rgba(134,239,172,0.1))' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${allChecked ? 'rgba(134,239,172,0.25)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 14, color: allChecked ? '#86efac' : '#5b5580', fontSize: 15, fontWeight: 600,
            fontFamily: "'Playfair Display', serif", cursor: allChecked ? 'pointer' : 'not-allowed',
            opacity: allChecked ? 1 : 0.5, transition: 'all 0.3s', letterSpacing: '0.05em',
          }}>
          {saving ? (isRTL ? 'נועל...' : 'Locking...') : allChecked ? (isRTL ? '🔒 נעל טקס בוקר' : '🔒 Lock Morning Ritual') : (isRTL ? `השלם את כל הפריטים (${checkCount}/8)` : `Complete all items (${checkCount}/8)`)}
        </motion.button>
      </div>
    </>
  );
};
