import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveImage } from '@/lib/image-store';

interface Props {
  isRTL: boolean;
  todayCompleted: boolean;
  onSave: (data: { mood: number; energy: number; intention: string; marketSentiment: number }) => Promise<any>;
}

const GOLD = '#D4AF37';
const DARK_GOLD = '#B8962E';
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

const ASSET_CARDS = [
  { key: 'btc', label: 'Bitcoin', ticker: 'BTC', icon: '₿' },
  { key: 'eth', label: 'Ethereum', ticker: 'ETH', icon: 'Ξ' },
  { key: 'sp500', label: 'S&P 500', ticker: 'SPX', icon: '📈' },
  { key: 'nasdaq', label: 'NASDAQ', ticker: 'NDX', icon: '📊' },
];

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

const VITALS = [
  { key: 'sleep', label: 'Sleep Quality', labelHe: 'איכות שינה' },
  { key: 'pressure', label: 'Under Pressure', labelHe: 'תחת לחץ' },
  { key: 'excitement', label: 'Excited / FOMO', labelHe: 'התרגשות / FOMO' },
  { key: 'recovering', label: 'Recovering Losses', labelHe: 'מתאושש מהפסדים' },
];

// Custom Gold Switch
const GoldSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <motion.button
    onClick={() => onChange(!checked)}
    whileTap={{ scale: 0.95 }}
    style={{
      width: 48, height: 26, borderRadius: 13, padding: 2,
      background: checked
        ? `linear-gradient(135deg, ${GOLD}, ${DARK_GOLD})`
        : 'rgba(0,0,0,0.08)',
      border: `1px solid ${checked ? 'rgba(212,175,55,0.4)' : 'rgba(0,0,0,0.06)'}`,
      cursor: 'pointer', position: 'relative',
      transition: 'all 0.3s ease',
      display: 'flex', alignItems: 'center',
    }}
  >
    <motion.div
      animate={{ x: checked ? 22 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        width: 22, height: 22, borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: checked
          ? '0 2px 8px rgba(212,175,55,0.3)'
          : '0 1px 4px rgba(0,0,0,0.1)',
      }}
    />
  </motion.button>
);

// Gold-themed Slider
const GoldSlider = ({ value, max, onChange, leftLabel, rightLabel }: {
  value: number; max: number; onChange: (v: number) => void; leftLabel?: string; rightLabel?: string;
}) => {
  const pct = ((value - 1) / (max - 1)) * 100;
  return (
    <div>
      <div style={{ position: 'relative', height: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 4, cursor: 'pointer' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct}%`, borderRadius: 4,
          background: `linear-gradient(90deg, ${GOLD}, ${DARK_GOLD})`,
          transition: 'width 0.15s ease',
        }} />
        <input type="range" min={1} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: `${pct}%`, marginLeft: -10,
          width: 20, height: 20, borderRadius: '50%',
          background: '#FFFFFF', border: `2px solid ${GOLD}`,
          boxShadow: '0 2px 8px rgba(212,175,55,0.2)',
          pointerEvents: 'none',
          transition: 'left 0.15s ease',
        }} />
      </div>
      {(leftLabel || rightLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#8A8A9A' }}>
          <span>{leftLabel}</span><span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
};

export const MorningRitualPage = ({ isRTL, todayCompleted, onSave }: Props) => {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sentiment, setSentiment] = useState(50);
  const [assetNotes, setAssetNotes] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState<Record<string, boolean>>({ sleep: true, pressure: false, excitement: false, recovering: false });
  const [btcThoughts, setBtcThoughts] = useState('');
  const [intentions, setIntentions] = useState('');
  const [checklist, setChecklist] = useState<boolean[]>(Array(8).fill(false));
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hudActive, setHudActive] = useState(false);
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allChecked = checklist.every(Boolean);
  const checkCount = checklist.filter(Boolean).length;

  const handleChartUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const id = `morning-chart-${Date.now()}`;
    await saveImage(id, file, { category: 'archive', fileName: file.name });
    setChartUrl(URL.createObjectURL(file));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const intention = [
      btcThoughts && `[BTC THOUGHTS] ${btcThoughts}`,
      intentions && `[INTENTIONS] ${intentions}`,
      ...Object.entries(assetNotes).filter(([, v]) => v.trim()).map(([k, v]) => `[${k.toUpperCase()}] ${v}`),
      `[VITALS] ${Object.entries(vitals).map(([k, v]) => `${k}:${v ? 'yes' : 'no'}`).join(', ')}`,
    ].filter(Boolean).join('\n');
    await onSave({ mood, energy, intention, marketSentiment: sentiment });
    setSaving(false);
    setHudActive(true);
    setTimeout(() => { setHudActive(false); setLocked(true); }, 3500);
  }, [mood, energy, sentiment, assetNotes, vitals, btcThoughts, intentions, onSave]);

  const toggleCheck = (i: number) => {
    setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const fgColor = sentiment <= 25 ? RED : sentiment <= 45 ? '#D4A017' : sentiment <= 55 ? GOLD : sentiment <= 75 ? GREEN : '#1B4332';
  const fgLabel = sentiment <= 25 ? 'Extreme Fear' : sentiment <= 45 ? 'Fear' : sentiment <= 55 ? 'Neutral' : sentiment <= 75 ? 'Greed' : 'Extreme Greed';

  if (todayCompleted || locked) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🌅</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            {isRTL ? 'הניתוח הושלם' : 'Analysis Complete'}
          </div>
          <div style={{ fontSize: 13, color: '#8A8A9A' }}>
            {isRTL ? 'הנחיות הבוקר ננעלו. מוכנות חכמה פעילה.' : 'Morning directives locked. Smart readiness active.'}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 20, marginTop: 24,
            background: `linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04))`,
            border: `1px solid rgba(212,175,55,0.2)`,
          }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em' }}>CALIBRATED ✓</span>
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
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,248,245,0.97)', backdropFilter: 'blur(30px)' }}>
            {[1, 2, 3].map(i => (
              <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1], opacity: [0, 0.4, 0.1] }}
                transition={{ duration: 1.2, delay: i * 0.15 }}
                style={{ position: 'absolute', width: 120 * i, height: 120 * i, borderRadius: '50%', border: `1px solid rgba(212,175,55,0.25)` }} />
            ))}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
                style={{ fontSize: 32, fontWeight: 700, color: GOLD, fontFamily: "'Playfair Display', serif", letterSpacing: '0.15em', textShadow: '0 0 40px rgba(212,175,55,0.3)', marginBottom: 16 }}>
                CALIBRATED
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                style={{ fontSize: 14, color: '#8A8A9A', letterSpacing: '0.15em' }}>
                BIAS CONFIRMED • RISK DEFINED
              </motion.div>
              <motion.div initial={{ width: 0 }} animate={{ width: 200 }} transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: '24px auto 0' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
            {isRTL ? 'ניתוח בוקר' : 'Morning Analysis'}
          </h2>
          <div style={{ fontSize: 13, color: '#8A8A9A', fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'הכן את המוח, הגדר את ההטיה, נעל את הכוונה.' : 'Prepare the mind, define the bias, lock the intention.'}
          </div>
        </div>

        {/* HERO — Morning Chart Upload */}
        <div style={{ ...GLASS, padding: 0, overflow: 'hidden' }}>
          {chartUrl ? (
            <div style={{ position: 'relative' }}>
              <img src={chartUrl} alt="Morning Chart" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => fileRef.current?.click()} style={{
                position: 'absolute', bottom: 12, right: 12,
                padding: '6px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
                border: `1px solid rgba(212,175,55,0.2)`,
                color: SLATE, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Replace</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', padding: '60px 20px', background: 'transparent',
              border: 'none', cursor: 'pointer', color: '#8A8A9A', fontSize: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📷</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: SLATE, marginBottom: 6 }}>
                {isRTL ? 'העלה גרף בוקר' : 'Upload Morning Chart'}
              </div>
              <div style={{ fontSize: 12 }}>{isRTL ? 'לחץ או גרור תמונה' : 'Click or drag image'}</div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleChartUpload} style={{ display: 'none' }} />
        </div>

        {/* ASSET MATRIX — 4 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {ASSET_CARDS.map(asset => (
            <div key={asset.key} style={{
              ...GLASS, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{asset.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{asset.label}</div>
                  <div style={{ fontSize: 10, color: '#8A8A9A', fontWeight: 600, letterSpacing: '0.1em' }}>{asset.ticker}</div>
                </div>
              </div>
              <textarea
                value={assetNotes[asset.key] || ''}
                onChange={e => setAssetNotes(prev => ({ ...prev, [asset.key]: e.target.value }))}
                placeholder={isRTL ? 'מה אתה חושב שיקרה היום?' : 'What do you think will happen today?'}
                rows={3}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.02)',
                  border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 10,
                  padding: '10px 12px', color: SLATE, fontSize: 12,
                  fontFamily: "'Inter', sans-serif",
                  resize: 'none', outline: 'none',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              />
            </div>
          ))}
        </div>

        {/* PSYCHOLOGICAL VITALS — Gold Switches */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'מדדים פסיכולוגיים' : 'PSYCHOLOGICAL VITALS'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {VITALS.map(v => (
              <div key={v.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <span style={{ fontSize: 13, color: SLATE, fontWeight: 500 }}>
                  {isRTL ? v.labelHe : v.label}
                </span>
                <GoldSwitch checked={vitals[v.key] || false} onChange={val => setVitals(prev => ({ ...prev, [v.key]: val }))} />
              </div>
            ))}
          </div>
        </div>

        {/* MOOD & ENERGY */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'מצב רוח ואנרגיה' : 'MOOD & ENERGY'}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'מצב רוח' : 'Mood'}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: GOLD }}>{mood}/10</span>
            </div>
            <GoldSlider value={mood} max={10} onChange={setMood} leftLabel={isRTL ? 'רע' : 'Low'} rightLabel={isRTL ? 'מצוין' : 'Excellent'} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'אנרגיה' : 'Energy'}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: DARK_GOLD }}>{energy}/10</span>
            </div>
            <GoldSlider value={energy} max={10} onChange={setEnergy} leftLabel={isRTL ? 'נמוך' : 'Depleted'} rightLabel={isRTL ? 'גבוה' : 'Charged'} />
          </div>
        </div>

        {/* FEAR & GREED GAUGE */}
        <div style={{ ...GLASS, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'מד תחושת שוק' : 'MARKET SENTIMENT GAUGE'}
          </div>
          <div style={{ position: 'relative', width: 220, height: 130, margin: '0 auto 16px' }}>
            <svg width="220" height="130" viewBox="0 0 220 130">
              <defs>
                <linearGradient id="fgGradGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={RED} /><stop offset="25%" stopColor="#D4A017" />
                  <stop offset="50%" stopColor={GOLD} /><stop offset="75%" stopColor={GREEN} />
                  <stop offset="100%" stopColor="#1B4332" />
                </linearGradient>
              </defs>
              <path d="M20 120 A90 90 0 0 1 200 120" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="14" strokeLinecap="round" />
              <path d="M20 120 A90 90 0 0 1 200 120" fill="none" stroke="url(#fgGradGold)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(sentiment / 100) * 283} 283`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              <text x="110" y="95" textAnchor="middle" fill={fgColor} fontSize="32" fontWeight="700" fontFamily="'Inter', sans-serif">{sentiment}</text>
              <text x="110" y="115" textAnchor="middle" fill="#8A8A9A" fontSize="10" fontFamily="'Inter', sans-serif">{fgLabel}</text>
            </svg>
          </div>
          <GoldSlider value={sentiment} max={100} onChange={setSentiment} leftLabel="Extreme Fear" rightLabel="Extreme Greed" />
        </div>

        {/* THOUGHTS */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
            {isRTL ? 'מחשבות בוקר' : 'MORNING THOUGHTS'}
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, color: SLATE, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              {isRTL ? 'מחשבות על ביטקוין?' : 'Bitcoin Morning Thoughts?'}
            </div>
            <textarea value={btcThoughts} onChange={e => setBtcThoughts(e.target.value)}
              placeholder={isRTL ? 'מה ההטיה שלך לגבי BTC?' : 'What is your BTC bias today?'}
              rows={3}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.02)',
                border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 10,
                padding: '12px 14px', color: SLATE, fontSize: 13,
                fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 14, color: SLATE, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              {isRTL ? 'כוונות יומיות' : 'Daily Intentions'}
            </div>
            <textarea value={intentions} onChange={e => setIntentions(e.target.value)}
              placeholder={isRTL ? 'מה הכוונה שלך להיום?' : 'What do you intend to accomplish today?'}
              rows={3}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.02)',
                border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 10,
                padding: '12px 14px', color: SLATE, fontSize: 13,
                fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            />
          </div>
        </div>

        {/* EXECUTION CHECKLIST */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {isRTL ? 'רשימת ביצוע' : 'EXECUTION CHECKLIST'}
            </div>
            <div style={{ fontSize: 12, color: allChecked ? GREEN : '#8A8A9A', fontWeight: 700 }}>{checkCount}/8</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHECKLIST_ITEMS.map((item, i) => (
              <motion.button key={i} onClick={() => toggleCheck(i)} whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: checklist[i] ? 'rgba(45,106,79,0.04)' : 'rgba(0,0,0,0.01)',
                  border: `1px solid ${checklist[i] ? 'rgba(45,106,79,0.12)' : 'rgba(0,0,0,0.04)'}`,
                  borderRadius: 12, cursor: 'pointer', width: '100%',
                  textAlign: isRTL ? 'right' : 'left', transition: 'all 0.2s',
                }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${checklist[i] ? GREEN : 'rgba(0,0,0,0.12)'}`,
                  background: checklist[i] ? 'rgba(45,106,79,0.08)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                }}>
                  {checklist[i] && <span style={{ color: GREEN, fontSize: 14, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{
                  fontSize: 14, color: checklist[i] ? GREEN : SLATE,
                  textDecoration: checklist[i] ? 'line-through' : 'none',
                  opacity: checklist[i] ? 0.6 : 1, transition: 'all 0.2s',
                }}>{isRTL ? item.labelHe : item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* CALIBRATE & LOCK */}
        <motion.button onClick={handleSave} disabled={saving || !allChecked}
          whileHover={allChecked ? { scale: 1.01 } : {}} whileTap={allChecked ? { scale: 0.98 } : {}}
          style={{
            width: '100%', padding: '18px 24px',
            background: allChecked
              ? `linear-gradient(135deg, ${GOLD}, ${DARK_GOLD})`
              : 'rgba(0,0,0,0.04)',
            border: `1px solid ${allChecked ? 'rgba(212,175,55,0.4)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 14, color: allChecked ? '#FFFFFF' : '#B0B0BE',
            fontSize: 16, fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            cursor: allChecked ? 'pointer' : 'not-allowed',
            letterSpacing: '0.1em',
            boxShadow: allChecked ? '0 4px 20px rgba(212,175,55,0.25)' : 'none',
            transition: 'all 0.3s',
          }}>
          {saving
            ? (isRTL ? 'נועל...' : 'Locking...')
            : allChecked
            ? (isRTL ? '🔒 CALIBRATE & LOCK' : '🔒 CALIBRATE & LOCK')
            : (isRTL ? `השלם את כל הפריטים (${checkCount}/8)` : `Complete all items (${checkCount}/8)`)}
        </motion.button>
      </div>
    </>
  );
};
