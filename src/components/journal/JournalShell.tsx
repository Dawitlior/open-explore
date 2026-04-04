import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJournal, type MorningData, type EveningData, type AssetBias, type PsychVitals } from '@/contexts/JournalContext';
import { JournalArchive } from './JournalArchive';
import type { Trade } from '@/data/trades';

// ─── Journal Design DNA ───
const J = {
  bg: '#05070D',
  card: 'rgba(15, 20, 35, 0.65)',
  cardBorder: 'rgba(100, 220, 255, 0.08)',
  accent: { cyan: '#00FFC6', purple: '#7B61FF', gold: '#D4AF37' },
  text: { primary: '#F0F4F8', secondary: '#94A3B8', muted: '#64748B', dim: '#475569' },
  glass: { blur: 'blur(12px)', bg: 'rgba(12, 18, 30, 0.55)', border: '1px solid rgba(100, 220, 255, 0.1)' },
  radius: 16,
};

// ─── Glassmorphic Card ───
const GlassCard = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{
    background: J.glass.bg,
    backdropFilter: J.glass.blur,
    WebkitBackdropFilter: J.glass.blur,
    border: J.glass.border,
    borderRadius: J.radius,
    padding: 24,
    ...style,
  }}>
    {children}
  </div>
);

// ─── Gold Toggle ───
const GoldToggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '12px 16px',
      background: value ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${value ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s ease',
    }}
  >
    <span style={{ fontSize: 13, color: J.text.secondary, fontFamily: "'Inter', sans-serif" }}>{label}</span>
    <div style={{
      width: 40, height: 22, borderRadius: 11,
      background: value ? `linear-gradient(135deg, ${J.accent.gold}, #B8860B)` : 'rgba(100,116,139,0.3)',
      transition: 'all 0.3s ease', position: 'relative',
      boxShadow: value ? `0 0 12px rgba(212, 175, 55, 0.3)` : 'none',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', position: 'absolute', top: 3,
        left: value ? 21 : 3, transition: 'left 0.3s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  </button>
);

// ─── Emotion Bubbles ───
const EMOTIONS = ['Confident', 'Anxious', 'Focused', 'Fearful', 'Calm', 'Greedy', 'Patient', 'Frustrated', 'Disciplined', 'Revenge'];
const EmotionBubbles = ({ selected, onToggle }: { selected: string[]; onToggle: (e: string) => void }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {EMOTIONS.map(e => {
      const active = selected.includes(e);
      return (
        <button key={e} onClick={() => onToggle(e)} style={{
          padding: '6px 16px', borderRadius: 20,
          background: active ? `linear-gradient(135deg, ${J.accent.cyan}20, ${J.accent.purple}15)` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${active ? J.accent.cyan + '40' : 'rgba(255,255,255,0.06)'}`,
          color: active ? J.accent.cyan : J.text.muted,
          fontSize: 12, fontWeight: active ? 600 : 400,
          cursor: 'pointer', transition: 'all 0.25s ease',
          boxShadow: active ? `0 0 12px ${J.accent.cyan}15` : 'none',
        }}>
          {e}
        </button>
      );
    })}
  </div>
);

// ─── Image Upload Zone ───
const ImageUpload = ({ image, onUpload, label }: { image: string | null; onUpload: (img: string) => void; label: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        width: '100%', minHeight: image ? 'auto' : 220,
        borderRadius: J.radius, overflow: 'hidden', cursor: 'pointer',
        border: `2px dashed ${image ? 'transparent' : 'rgba(100, 220, 255, 0.15)'}`,
        background: image ? 'transparent' : 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease', position: 'relative',
      }}
    >
      {image ? (
        <img src={image} alt="Chart" style={{ width: '100%', borderRadius: J.radius, display: 'block' }} />
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📈</div>
          <div style={{ fontSize: 13, color: J.text.muted }}>{label}</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
};

// ─── Checklist Items ───
const CHECKLIST = [
  'Reviewed HTF bias',
  'Identified key levels',
  'Defined setups for today',
  'Risk per trade is set',
  'Emotional state assessed',
  'No revenge trading intent',
  'Sleep quality is adequate',
  'Market context analyzed',
];

interface JournalShellProps {
  onExit: () => void;
  trades: Trade[];
  isRTL: boolean;
}

export const JournalShell = ({ onExit, trades, isRTL }: JournalShellProps) => {
  const { currentDay, saveMorning, saveEvening, isMorningLocked, isEveningComplete } = useJournal();

  // ─── Morning State ───
  const [chartImage, setChartImage] = useState<string | null>(currentDay.morning?.chartImage || null);
  const [assetMatrix, setAssetMatrix] = useState<AssetBias[]>(
    currentDay.morning?.assetMatrix || [
      { asset: 'BTC', bias: '' }, { asset: 'ETH', bias: '' },
      { asset: 'S&P 500', bias: '' }, { asset: 'NASDAQ', bias: '' },
    ]
  );
  const [freeWriting, setFreeWriting] = useState(currentDay.morning?.freeWriting || '');
  const [bitcoinThoughts, setBitcoinThoughts] = useState(currentDay.morning?.bitcoinThoughts || '');
  const [emotions, setEmotions] = useState<string[]>(currentDay.morning?.emotion || []);
  const [vitals, setVitals] = useState<PsychVitals>(currentDay.morning?.vitals || { sleep: false, pressure: false, excitement: false, recovery: false });
  const [fearGreed, setFearGreed] = useState(currentDay.morning?.fearGreed || 50);
  const [checklist, setChecklist] = useState<boolean[]>(currentDay.morning?.checklist || new Array(CHECKLIST.length).fill(false));
  const [lockAnim, setLockAnim] = useState(false);

  // ─── Evening State ───
  const [finalChart, setFinalChart] = useState<string | null>(currentDay.evening?.finalChartImage || null);
  const [forensicLessons, setForensicLessons] = useState(currentDay.evening?.forensicLessons || '');
  const [biasAccuracy, setBiasAccuracy] = useState(currentDay.evening?.biasAccuracy || '');
  const [rulesFollowed, setRulesFollowed] = useState(currentDay.evening?.rulesFollowed ?? true);
  const [vaultAnim, setVaultAnim] = useState(false);

  // ─── Archive ───
  const [showArchive, setShowArchive] = useState(false);

  // ─── Progress ───
  const morningProgress = (() => {
    let done = 0;
    if (chartImage) done++;
    if (assetMatrix.some(a => a.bias.length > 0)) done++;
    if (freeWriting.length > 0) done++;
    if (emotions.length > 0) done++;
    if (checklist.some(c => c)) done++;
    return Math.round((done / 5) * 100);
  })();

  const toggleEmotion = useCallback((e: string) => {
    setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }, []);

  const handleLockMorning = useCallback(async () => {
    setLockAnim(true);
    const data: MorningData = {
      chartImage, assetMatrix, freeWriting, bitcoinThoughts,
      emotion: emotions, vitals, fearGreed, checklist,
      locked: true, timestamp: new Date().toISOString(),
    };
    await saveMorning(data);
    setTimeout(() => setLockAnim(false), 1500);
  }, [chartImage, assetMatrix, freeWriting, bitcoinThoughts, emotions, vitals, fearGreed, checklist, saveMorning]);

  const handleCloseSession = useCallback(async () => {
    setVaultAnim(true);
    const data: EveningData = {
      finalChartImage: finalChart, forensicLessons, biasAccuracy,
      rulesFollowed, executionTags: {}, completed: true,
      timestamp: new Date().toISOString(),
    };
    await saveEvening(data);
    setTimeout(() => setVaultAnim(false), 1800);
  }, [finalChart, forensicLessons, biasAccuracy, rulesFollowed, saveEvening]);

  const todayTrades = trades.filter(tr => {
    const d = new Date(tr.date.replace(' ', 'T'));
    return d.toDateString() === new Date().toDateString();
  });

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="journal-shell" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: J.bg,
      color: J.text.primary,
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'auto',
    }}>
      {/* ─── Floating Archive Bubble ─── */}
      <motion.button
        onClick={() => setShowArchive(true)}
        animate={isMorningLocked ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 110, width: 44, height: 44, borderRadius: '50%',
          background: `linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))`,
          border: '1px solid rgba(212, 175, 55, 0.3)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18,
          boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)',
        }}
      >
        📜
      </motion.button>

      {/* ─── Exit Button ─── */}
      <button
        onClick={onExit}
        style={{
          position: 'fixed', top: 20, right: isRTL ? 'auto' : 20, left: isRTL ? 20 : 'auto',
          zIndex: 110, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: J.text.muted, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        ✕
      </button>

      {/* ─── Content ─── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '70px 24px 60px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <h1 style={{
            fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em',
            fontFamily: "'Playfair Display', 'Georgia', serif",
            background: `linear-gradient(135deg, ${J.accent.cyan}, ${J.accent.purple})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            {isMorningLocked ? 'Evening Reflection' : 'Morning Ritual'}
          </h1>
          <p style={{ fontSize: 13, color: J.text.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {currentDate}
          </p>
          {isEveningComplete && (
            <div style={{ marginTop: 16, padding: '10px 24px', borderRadius: 20, display: 'inline-block',
              background: 'rgba(0, 255, 198, 0.06)', border: '1px solid rgba(0, 255, 198, 0.15)' }}>
              <span style={{ fontSize: 12, color: J.accent.cyan }}>✓ Today's session is complete</span>
            </div>
          )}
        </motion.div>

        {/* ═══ MORNING PHASE ═══ */}
        {!isMorningLocked && !isEveningComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* ── Left Column (60%) ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Morning Chart Upload */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Morning Chart</div>
                  <ImageUpload image={chartImage} onUpload={setChartImage} label="Upload your morning analysis chart" />
                </GlassCard>

                {/* Asset Matrix */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Daily Bias Matrix</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {assetMatrix.map((a, i) => (
                      <div key={a.asset} style={{
                        padding: 14, borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${a.bias ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: J.accent.gold, marginBottom: 8, letterSpacing: '0.05em' }}>{a.asset}</div>
                        <textarea
                          value={a.bias}
                          onChange={e => {
                            const next = [...assetMatrix];
                            next[i] = { ...a, bias: e.target.value };
                            setAssetMatrix(next);
                          }}
                          placeholder="Your bias..."
                          style={{
                            width: '100%', minHeight: 50, resize: 'vertical',
                            background: 'transparent', border: 'none', outline: 'none',
                            color: J.text.secondary, fontSize: 12, lineHeight: 1.5,
                            fontFamily: "'Inter', sans-serif",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Free Writing */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Market Expectations</div>
                  <textarea
                    value={freeWriting}
                    onChange={e => setFreeWriting(e.target.value)}
                    placeholder="What do you think will happen today?"
                    style={{
                      width: '100%', minHeight: 100, resize: 'vertical',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 14, outline: 'none',
                      color: J.text.primary, fontSize: 13, lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </GlassCard>

                {/* Bitcoin Thoughts */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Bitcoin Morning Thoughts</div>
                  <textarea
                    value={bitcoinThoughts}
                    onChange={e => setBitcoinThoughts(e.target.value)}
                    placeholder="Your BTC thesis for today..."
                    style={{
                      width: '100%', minHeight: 80, resize: 'vertical',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 14, outline: 'none',
                      color: J.text.primary, fontSize: 13, lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </GlassCard>
              </div>

              {/* ── Right Column (40%) ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 80 }}>
                {/* Emotion Bubbles */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>How Do I Feel Today?</div>
                  <EmotionBubbles selected={emotions} onToggle={toggleEmotion} />
                </GlassCard>

                {/* Psych Vitals */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Psychological Vitals</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <GoldToggle label="Slept Well" value={vitals.sleep} onChange={v => setVitals(p => ({ ...p, sleep: v }))} />
                    <GoldToggle label="Under Pressure" value={vitals.pressure} onChange={v => setVitals(p => ({ ...p, pressure: v }))} />
                    <GoldToggle label="High Excitement" value={vitals.excitement} onChange={v => setVitals(p => ({ ...p, excitement: v }))} />
                    <GoldToggle label="Recovery Mode" value={vitals.recovery} onChange={v => setVitals(p => ({ ...p, recovery: v }))} />
                  </div>
                </GlassCard>

                {/* Fear & Greed Gauge */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Fear & Greed Sentiment</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: fearGreed > 70 ? '#ef4444' : fearGreed > 40 ? J.accent.gold : J.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                      {fearGreed}
                    </div>
                    <input type="range" min={0} max={100} value={fearGreed} onChange={e => setFearGreed(+e.target.value)}
                      style={{ width: '100%', accentColor: J.accent.gold }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: J.text.dim, marginTop: 4 }}>
                      <span>Extreme Fear</span><span>Extreme Greed</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Execution Checklist */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Pre-Session Checklist</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {CHECKLIST.map((item, i) => (
                      <label key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                        padding: '8px 12px', borderRadius: 10,
                        background: checklist[i] ? 'rgba(0, 255, 198, 0.04)' : 'transparent',
                        border: `1px solid ${checklist[i] ? 'rgba(0, 255, 198, 0.12)' : 'transparent'}`,
                        transition: 'all 0.2s ease',
                      }}>
                        <input type="checkbox" checked={checklist[i]}
                          onChange={() => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                          style={{ accentColor: J.accent.cyan, width: 16, height: 16 }} />
                        <span style={{ fontSize: 12, color: checklist[i] ? J.text.primary : J.text.muted }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </GlassCard>

                {/* Progress + Lock Button */}
                <GlassCard style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Ritual Progress</div>
                  {/* Vertical progress bar */}
                  <div style={{ width: 4, height: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '0 auto 16px', position: 'relative', overflow: 'hidden' }}>
                    <motion.div
                      animate={{ height: `${morningProgress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: `linear-gradient(to top, ${J.accent.cyan}, ${J.accent.purple})`,
                        borderRadius: 2,
                        boxShadow: `0 0 8px ${J.accent.cyan}40`,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: J.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
                    {morningProgress}%
                  </div>
                  <motion.button
                    onClick={handleLockMorning}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', padding: '14px 24px', borderRadius: 28,
                      background: morningProgress > 40
                        ? `linear-gradient(135deg, ${J.accent.cyan}, ${J.accent.purple})`
                        : 'rgba(255,255,255,0.05)',
                      border: 'none', color: morningProgress > 40 ? '#05070D' : J.text.dim,
                      fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                      cursor: morningProgress > 40 ? 'pointer' : 'default',
                      textTransform: 'uppercase',
                      boxShadow: morningProgress > 40 ? `0 0 30px ${J.accent.cyan}25` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {lockAnim ? '🔒 CALIBRATING...' : '🎯 LOCK MORNING'}
                  </motion.button>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ EVENING PHASE ═══ */}
        {isMorningLocked && !isEveningComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* ── Left: Comparison ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Morning Bias vs Reality */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.accent.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Morning Bias ↔ Reality</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 9, color: J.text.dim, textTransform: 'uppercase', marginBottom: 8 }}>Morning Chart</div>
                      {currentDay.morning?.chartImage ? (
                        <img src={currentDay.morning.chartImage} alt="Morning" style={{ width: '100%', borderRadius: 12 }} />
                      ) : (
                        <div style={{ padding: 20, textAlign: 'center', color: J.text.dim, fontSize: 11 }}>No morning chart</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: J.text.dim, textTransform: 'uppercase', marginBottom: 8 }}>End of Day Chart</div>
                      <ImageUpload image={finalChart} onUpload={setFinalChart} label="Upload EOD chart" />
                    </div>
                  </div>
                  {/* Morning Bias Text */}
                  {currentDay.morning?.freeWriting && (
                    <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(212, 175, 55, 0.04)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                      <div style={{ fontSize: 9, color: J.accent.gold, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Your Morning Expectation</div>
                      <div style={{ fontSize: 12, color: J.text.secondary, lineHeight: 1.6, fontStyle: 'italic' }}>"{currentDay.morning.freeWriting}"</div>
                    </div>
                  )}
                </GlassCard>

                {/* Bias Accuracy */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Bias Accuracy Assessment</div>
                  <textarea
                    value={biasAccuracy}
                    onChange={e => setBiasAccuracy(e.target.value)}
                    placeholder="How accurate was your morning bias? What surprised you?"
                    style={{
                      width: '100%', minHeight: 80, resize: 'vertical',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 14, outline: 'none',
                      color: J.text.primary, fontSize: 13, lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </GlassCard>

                {/* Forensic Lessons */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Forensic Lessons & Mistakes</div>
                  <textarea
                    value={forensicLessons}
                    onChange={e => setForensicLessons(e.target.value)}
                    placeholder="What did you learn today? What mistakes did you make? What will you do differently?"
                    style={{
                      width: '100%', minHeight: 120, resize: 'vertical',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 14, outline: 'none',
                      color: J.text.primary, fontSize: 13, lineHeight: 1.7,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </GlassCard>
              </div>

              {/* ── Right: Trade Review + Session Close ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 80 }}>
                {/* Today's Trades */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Today's Trades ({todayTrades.length})</div>
                  {todayTrades.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: J.text.dim, fontSize: 12 }}>No trades today</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {todayTrades.map(tr => (
                        <div key={tr.id} style={{
                          padding: 12, borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)',
                          border: `1px solid ${tr.pnl >= 0 ? 'rgba(0, 255, 198, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: J.accent.cyan }}>{tr.coin}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: tr.pnl >= 0 ? '#10b981' : '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
                              {tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)} ({tr.returnR.toFixed(2)}R)
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: J.text.dim, marginTop: 4 }}>
                            {tr.direction} • Entry: {tr.entry} → Exit: {tr.exit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {/* Rules Toggle */}
                <GlassCard>
                  <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontWeight: 600 }}>Rules Adherence</div>
                  <GoldToggle label="Did you follow your rules today?" value={rulesFollowed} onChange={setRulesFollowed} />
                </GlassCard>

                {/* Morning Emotions Recap */}
                {currentDay.morning?.emotion && currentDay.morning.emotion.length > 0 && (
                  <GlassCard>
                    <div style={{ fontSize: 10, color: J.text.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontWeight: 600 }}>Morning Emotional State</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {currentDay.morning.emotion.map(e => (
                        <span key={e} style={{
                          padding: '4px 12px', borderRadius: 16,
                          background: `rgba(212, 175, 55, 0.08)`,
                          border: '1px solid rgba(212, 175, 55, 0.15)',
                          fontSize: 11, color: J.accent.gold,
                        }}>{e}</span>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Close Session */}
                <GlassCard style={{ textAlign: 'center' }}>
                  <motion.button
                    onClick={handleCloseSession}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', padding: '16px 24px', borderRadius: 28,
                      background: `linear-gradient(135deg, ${J.accent.purple}, #4C1D95)`,
                      border: 'none', color: '#fff',
                      fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                      cursor: 'pointer', textTransform: 'uppercase',
                      boxShadow: `0 0 30px ${J.accent.purple}25`,
                    }}
                  >
                    {vaultAnim ? '🔐 SEALING VAULT...' : '🔒 CLOSE SESSION'}
                  </motion.button>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ COMPLETED STATE ═══ */}
        {isEveningComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <GlassCard style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 300, color: J.text.primary, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 8 }}>
                Session Complete
              </div>
              <div style={{ fontSize: 13, color: J.text.muted, lineHeight: 1.6, marginBottom: 24 }}>
                Your trading ritual for today has been sealed. Review past sessions in the Archive.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setShowArchive(true)}
                  style={{
                    padding: '10px 24px', borderRadius: 24,
                    background: `linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))`,
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: J.accent.gold, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.05em',
                  }}
                >
                  📜 Open Archive
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  onClick={onExit}
                  style={{
                    padding: '10px 24px', borderRadius: 24,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: J.text.secondary, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Return to Orca
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* ─── Archive Overlay ─── */}
      <AnimatePresence>
        {showArchive && <JournalArchive onClose={() => setShowArchive(false)} />}
      </AnimatePresence>

      {/* ─── Lock Animation Overlay ─── */}
      <AnimatePresence>
        {lockAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(5, 7, 13, 0.85)',
              backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1.5, ease: 'linear' }}
                style={{ fontSize: 56, marginBottom: 16 }}
              >
                🎯
              </motion.div>
              <div style={{
                fontSize: 14, color: J.accent.cyan, letterSpacing: '0.2em',
                textTransform: 'uppercase', fontWeight: 700,
              }}>
                CALIBRATE & LOCK
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Vault Animation Overlay ─── */}
      <AnimatePresence>
        {vaultAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(5, 7, 13, 0.9)',
              backdropFilter: 'blur(24px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 2, opacity: 0.3 }}
              animate={{ scale: [2, 0.8, 1], opacity: [0.3, 1, 0] }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 72 }}>🔐</div>
              <div style={{
                fontSize: 12, color: J.accent.purple, letterSpacing: '0.3em',
                textTransform: 'uppercase', fontWeight: 700, marginTop: 12,
              }}>
                VAULT SEALED
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
