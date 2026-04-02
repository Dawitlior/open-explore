import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { MorningRitual } from '@/hooks/use-journal-mode';
import { saveImage, getImagesByTrade, createImageURL } from '@/lib/image-store';

interface Props {
  isRTL: boolean;
  todayCompleted: boolean;
  todayTrades: Trade[];
  todayPnl: number;
  todayMorning?: MorningRitual | null;
  onSave: (data: { debrief: string; lessonsLearned: string; tiltLevel: number; emotionalState: string }) => Promise<any>;
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

type ExecutionQuality = 'Clean' | 'OK' | 'Weak';
type ExitQuality = 'Planned' | 'Early' | 'Forced';
type PlanDeviation = 'None' | 'Minor' | 'Major';

// Gold Switch
const GoldSwitch = ({ checked, onChange, labelYes = 'YES', labelNo = 'NO' }: {
  checked: boolean; onChange: (v: boolean) => void; labelYes?: string; labelNo?: string;
}) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {[false, true].map(val => (
      <button key={String(val)} onClick={() => onChange(val)} style={{
        padding: '6px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        background: checked === val
          ? (val ? `rgba(45,106,79,0.08)` : `rgba(196,69,54,0.08)`)
          : 'rgba(0,0,0,0.02)',
        border: `1px solid ${checked === val
          ? (val ? 'rgba(45,106,79,0.2)' : 'rgba(196,69,54,0.2)')
          : 'rgba(0,0,0,0.04)'}`,
        color: checked === val ? (val ? GREEN : RED) : '#8A8A9A',
        cursor: 'pointer', transition: 'all 0.2s',
      }}>
        {val ? labelYes : labelNo}
      </button>
    ))}
  </div>
);

// Gold Slider
const GoldSlider = ({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) => {
  const pct = ((value - 1) / (max - 1)) * 100;
  return (
    <div style={{ position: 'relative', height: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${pct}%`, borderRadius: 4,
        background: `linear-gradient(90deg, ${GREEN}, ${GOLD}, ${RED})`,
        transition: 'width 0.15s ease',
      }} />
      <input type="range" min={1} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
      <div style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: `${pct}%`, marginLeft: -10,
        width: 20, height: 20, borderRadius: '50%',
        background: '#FFFFFF', border: `2px solid ${GOLD}`,
        boxShadow: '0 2px 8px rgba(212,175,55,0.2)',
        pointerEvents: 'none', transition: 'left 0.15s ease',
      }} />
    </div>
  );
};

export const EODVaultPage = ({ isRTL, todayCompleted, todayTrades, todayPnl, todayMorning, onSave }: Props) => {
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [tilt, setTilt] = useState(1);
  const [emotionalState, setEmotionalState] = useState('');
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [vaultActive, setVaultActive] = useState(false);
  const [biasFollowed, setBiasFollowed] = useState(true);
  const [rulesFollowed, setRulesFollowed] = useState(true);
  const [tradeEvals, setTradeEvals] = useState<Record<number, { exec: ExecutionQuality; exit: ExitQuality; deviation: PlanDeviation }>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tradeImages, setTradeImages] = useState<Record<string, string[]>>({});
  const [eodChartUrl, setEodChartUrl] = useState<string | null>(null);
  const eodFileRef = useRef<HTMLInputElement>(null);

  // Parse morning bias text from intention
  const morningBias = todayMorning?.intention || '';

  useEffect(() => {
    todayTrades.forEach(async (tr) => {
      const imgs = await getImagesByTrade(tr.id);
      if (imgs.length > 0) {
        setTradeImages(prev => ({ ...prev, [tr.id]: imgs.map(createImageURL) }));
      }
    });
  }, [todayTrades]);

  const handleDrop = useCallback(async (e: React.DragEvent, tradeId: number) => {
    e.preventDefault(); setDragOver(null);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      const id = `trade-${tradeId}-${Date.now()}`;
      await saveImage(id, file, { tradeId, category: 'trade-screenshot', fileName: file.name });
      const url = URL.createObjectURL(file);
      setTradeImages(prev => ({ ...prev, [tradeId]: [...(prev[tradeId] || []), url] }));
    }
  }, []);

  const handleEodChartUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const id = `eod-chart-${Date.now()}`;
    await saveImage(id, file, { category: 'eod-chart', fileName: file.name });
    setEodChartUrl(URL.createObjectURL(file));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const debrief = [
      wins && `[WINS] ${wins}`,
      mistakes && `[MISTAKES] ${mistakes}`,
      `[BIAS_FOLLOWED] ${biasFollowed ? 'YES' : 'NO'}`,
      `[RULES_FOLLOWED] ${rulesFollowed ? 'YES' : 'NO'}`,
    ].filter(Boolean).join('\n');
    await onSave({ debrief, lessonsLearned: lessons, tiltLevel: tilt, emotionalState });
    setSaving(false); setVaultActive(true);
    setTimeout(() => { setVaultActive(false); setLocked(true); }, 3500);
  }, [wins, lessons, mistakes, tilt, emotionalState, biasFollowed, rulesFollowed, onSave]);

  const updateEval = (tradeId: number, field: string, value: string) => {
    setTradeEvals(prev => ({ ...prev, [tradeId]: { ...(prev[tradeId] || { exec: 'OK', exit: 'Planned', deviation: 'None' }), [field]: value } }));
  };

  const tiltColor = tilt <= 2 ? GREEN : tilt <= 3 ? GOLD : RED;
  const tiltLabel = tilt <= 1 ? 'Calm' : tilt <= 2 ? 'Stable' : tilt <= 3 ? 'Mild Tilt' : tilt <= 4 ? 'Tilted' : 'Full Tilt';

  if (todayCompleted || locked) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🌙</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            {isRTL ? 'הסשן נסגר' : 'Session Closed'}
          </div>
          <div style={{ fontSize: 13, color: '#8A8A9A' }}>
            {isRTL ? 'סיכום היום נשמר. מנוחה טובה.' : 'Daily debrief archived. Rest well.'}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 20, marginTop: 24,
            background: `linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04))`,
            border: `1px solid rgba(212,175,55,0.2)`,
          }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em' }}>SESSION CLOSED ✓</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Vault Seal Animation */}
      <AnimatePresence>
        {vaultActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,248,245,0.97)', backdropFilter: 'blur(30px)' }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2; const r = 200;
              return (
                <motion.div key={i}
                  initial={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r, opacity: 1, scale: 1 }}
                  animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  transition={{ duration: 1.5, delay: i * 0.03, ease: 'easeIn' }}
                  style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
              );
            })}
            <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: [2, 0.8, 1], opacity: [0, 1, 1] }} transition={{ duration: 1.5, delay: 0.5 }}
              style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, fontFamily: "'Playfair Display', serif", letterSpacing: '0.15em', textShadow: '0 0 40px rgba(212,175,55,0.3)' }}>
                SESSION CLOSED
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                style={{ fontSize: 14, color: '#8A8A9A', marginTop: 10 }}>
                {todayPnl >= 0 ? `+$${todayPnl.toFixed(2)}` : `-$${Math.abs(todayPnl).toFixed(2)}`} • {todayTrades.length} trades
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
            {isRTL ? 'רפלקציית ערב' : 'Evening Reflection'}
          </h2>
          <div style={{ fontSize: 13, color: '#8A8A9A' }}>
            {isRTL ? 'סכם, למד, שחרר.' : 'Debrief, learn, release.'}
          </div>
        </div>

        {/* Session Summary */}
        <div style={{ ...GLASS, padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: isRTL ? 'רווח/הפסד' : 'P&L', value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`, color: todayPnl >= 0 ? GREEN : RED },
            { label: isRTL ? 'עסקאות' : 'Trades', value: String(todayTrades.length), color: GOLD },
            { label: isRTL ? 'הצלחות' : 'Wins', value: String(todayTrades.filter(t => t.winLoss === 'Win').length), color: GREEN },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 10, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Morning Bias Comparison — blurred sidebar style */}
        {todayMorning && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{
              ...GLASS, padding: 20,
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ fontSize: 10, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>
                {isRTL ? 'הטיית בוקר' : 'MORNING BIAS'}
              </div>
              <div style={{ fontSize: 12, color: '#4A4A5A', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
                {morningBias || (isRTL ? 'לא הוזן' : 'Not recorded')}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: '#8A8A9A' }}>
                <span>Mood: {todayMorning.mood}/10</span>
                <span>Energy: {todayMorning.energy}/10</span>
                <span>Sentiment: {todayMorning.marketSentiment}</span>
              </div>
            </div>
            <div style={{ ...GLASS, padding: 20 }}>
              <div style={{ fontSize: 10, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>
                {isRTL ? 'גרף סיום יום' : 'EOD FINAL CHART'}
              </div>
              {eodChartUrl ? (
                <img src={eodChartUrl} alt="EOD" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(212,175,55,0.1)' }} />
              ) : (
                <button onClick={() => eodFileRef.current?.click()} style={{
                  width: '100%', padding: '24px', background: 'rgba(0,0,0,0.02)',
                  border: `2px dashed rgba(212,175,55,0.15)`, borderRadius: 10,
                  cursor: 'pointer', color: '#8A8A9A', fontSize: 12,
                }}>📸 {isRTL ? 'העלה גרף' : 'Upload Chart'}</button>
              )}
              <input ref={eodFileRef} type="file" accept="image/*" onChange={handleEodChartUpload} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {/* Execution vs. Expectation */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20 }}>
            {isRTL ? 'ביצוע מול ציפייה' : 'EXECUTION VS. EXPECTATION'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
              <span style={{ fontSize: 14, color: SLATE }}>{isRTL ? 'האם השוק עקב אחרי ההטיה שלי?' : 'Did the market follow my bias?'}</span>
              <GoldSwitch checked={biasFollowed} onChange={setBiasFollowed} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
              <span style={{ fontSize: 14, color: SLATE }}>{isRTL ? 'האם עקבתי אחרי הכללים שלי?' : 'Did I follow my rules?'}</span>
              <GoldSwitch checked={rulesFollowed} onChange={setRulesFollowed} />
            </div>
          </div>
        </div>

        {/* Trade Log with Intelligence Fields */}
        {todayTrades.length > 0 && (
          <div style={{ ...GLASS, padding: 24 }}>
            <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20 }}>
              {isRTL ? 'יומן עסקאות — תיוג ביצוע' : 'TRADE LOG — EXECUTION TAGGING'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {todayTrades.map(tr => {
                const ev = tradeEvals[tr.id] || { exec: 'OK', exit: 'Planned', deviation: 'None' };
                const imgs = tradeImages[tr.id] || [];
                return (
                  <div key={tr.id}
                    onDragOver={e => { e.preventDefault(); setDragOver(`trade-${tr.id}`); }}
                    onDragLeave={() => setDragOver(null)} onDrop={e => handleDrop(e, tr.id)}
                    style={{
                      background: dragOver === `trade-${tr.id}` ? 'rgba(212,175,55,0.04)' : 'rgba(0,0,0,0.01)',
                      border: `1px solid ${dragOver === `trade-${tr.id}` ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.04)'}`,
                      borderRadius: 12, padding: 18, transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700,
                          background: tr.winLoss === 'Win' ? 'rgba(45,106,79,0.08)' : 'rgba(196,69,54,0.08)',
                          color: tr.winLoss === 'Win' ? GREEN : RED,
                          border: `1px solid ${tr.winLoss === 'Win' ? 'rgba(45,106,79,0.15)' : 'rgba(196,69,54,0.15)'}`,
                        }}>{tr.winLoss}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{tr.coin}</span>
                        <span style={{ fontSize: 11, color: '#8A8A9A' }}>{tr.direction} • {tr.returnR >= 0 ? '+' : ''}{tr.returnR.toFixed(2)}R</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: tr.pnl >= 0 ? GREEN : RED }}>
                        {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                      {[
                        { field: 'exec', label: isRTL ? 'ביצוע' : 'Execution', opts: ['Clean', 'OK', 'Weak'] as ExecutionQuality[], current: ev.exec, colors: { Clean: GREEN, OK: GOLD, Weak: RED } },
                        { field: 'exit', label: isRTL ? 'יציאה' : 'Exit', opts: ['Planned', 'Early', 'Forced'] as ExitQuality[], current: ev.exit, colors: { Planned: GREEN, Early: GOLD, Forced: RED } },
                        { field: 'deviation', label: isRTL ? 'סטייה' : 'Deviation', opts: ['None', 'Minor', 'Major'] as PlanDeviation[], current: ev.deviation, colors: { None: GREEN, Minor: GOLD, Major: RED } },
                      ].map(grp => (
                        <div key={grp.field}>
                          <div style={{ fontSize: 9, color: '#8A8A9A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{grp.label}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {grp.opts.map(v => {
                              const c = (grp.colors as any)[v] || GOLD;
                              return (
                                <button key={v} onClick={() => updateEval(tr.id, grp.field, v)} style={{
                                  flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600,
                                  background: grp.current === v ? `${c}10` : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${grp.current === v ? `${c}30` : 'rgba(0,0,0,0.04)'}`,
                                  borderRadius: 6, cursor: 'pointer', color: grp.current === v ? c : '#8A8A9A',
                                }}>{v}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {imgs.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {imgs.map((url, j) => <img key={j} src={url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)' }} />)}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: '#B0B0BE', marginTop: 8 }}>
                      {isRTL ? '↑ גרור צילומי מסך לכאן' : '↑ Drag screenshots here'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Post-Market Analysis */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20 }}>
            {isRTL ? 'ניתוח פוסט-שוק' : 'POST-MARKET DEBRIEF'}
          </div>
          {[
            { key: 'wins', label: isRTL ? '✅ מה עבד?' : '✅ What Worked?', value: wins, setter: setWins, ph: isRTL ? 'הצלחות, תבניות טובות...' : 'Wins, good patterns...' },
            { key: 'lessons', label: isRTL ? '📖 שיעורי שוק' : '📖 Lessons & Insights', value: lessons, setter: setLessons, ph: isRTL ? 'שיעורים, תובנות...' : 'What did the market teach?' },
            { key: 'mistakes', label: isRTL ? '💀 טעויות' : '💀 Mistakes (Brutal Honesty)', value: mistakes, setter: setMistakes, ph: isRTL ? 'מה היית עושה אחרת?' : 'What would you do differently?' },
          ].map(sec => (
            <div key={sec.key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: SLATE, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>{sec.label}</div>
              <textarea value={sec.value} onChange={e => sec.setter(e.target.value)} placeholder={sec.ph} rows={3}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.02)',
                  border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 10,
                  padding: '12px 14px', color: SLATE, fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                  resize: 'vertical', outline: 'none', direction: isRTL ? 'rtl' : 'ltr',
                }} />
            </div>
          ))}
        </div>

        {/* Tilt Check */}
        <div style={{ ...GLASS, padding: 24 }}>
          <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20 }}>
            {isRTL ? 'בדיקת טילט' : 'TILT CHECK'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: SLATE, fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'רמת טילט' : 'Tilt Level'}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: tiltColor }}>{tilt}/5 — {tiltLabel}</span>
          </div>
          <GoldSlider value={tilt} max={5} onChange={setTilt} />
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, color: SLATE, marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'מצב רגשי' : 'Emotional State'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Focused', 'Confident', 'Anxious', 'Frustrated', 'Revenge', 'Euphoric', 'Exhausted', 'Neutral'].map(state => (
                <button key={state} onClick={() => setEmotionalState(state)} style={{
                  padding: '7px 16px', borderRadius: 20,
                  background: emotionalState === state ? `rgba(212,175,55,0.08)` : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${emotionalState === state ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.04)'}`,
                  color: emotionalState === state ? GOLD : '#8A8A9A',
                  fontSize: 12, fontWeight: emotionalState === state ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{state}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CLOSE SESSION */}
        <motion.button onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', padding: '18px 24px',
            background: `linear-gradient(135deg, ${GOLD}, ${DARK_GOLD})`,
            border: `1px solid rgba(212,175,55,0.4)`,
            borderRadius: 14, color: '#FFFFFF',
            fontSize: 16, fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            cursor: 'pointer', letterSpacing: '0.1em',
            boxShadow: '0 4px 20px rgba(212,175,55,0.25)',
            transition: 'all 0.3s',
          }}>
          {saving ? (isRTL ? 'סוגר...' : 'Closing...') : (isRTL ? '🔒 CLOSE SESSION' : '🔒 CLOSE SESSION')}
        </motion.button>
      </div>
    </>
  );
};
