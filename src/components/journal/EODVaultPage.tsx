import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import { saveImage, getImagesByTrade, createImageURL } from '@/lib/image-store';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  todayCompleted: boolean;
  todayTrades: Trade[];
  todayPnl: number;
  onSave: (data: { debrief: string; lessonsLearned: string; tiltLevel: number; emotionalState: string }) => Promise<any>;
}

const GLASS = {
  background: 'rgba(16,13,40,0.6)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
} as const;

type ExecutionQuality = 'Clean' | 'OK' | 'Weak';
type ExitQuality = 'Planned' | 'Early' | 'Forced';
type PlanDeviation = 'None' | 'Minor' | 'Major';

export const EODVaultPage = ({ T, isRTL, todayCompleted, todayTrades, todayPnl, onSave }: Props) => {
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [tilt, setTilt] = useState(1);
  const [emotionalState, setEmotionalState] = useState('');
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [vaultActive, setVaultActive] = useState(false);
  const [tradeEvals, setTradeEvals] = useState<Record<number, { exec: ExecutionQuality; exit: ExitQuality; deviation: PlanDeviation }>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tradeImages, setTradeImages] = useState<Record<string, string[]>>({});
  const [eodChartUrl, setEodChartUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eodFileRef = useRef<HTMLInputElement>(null);

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
    const debrief = [wins && `[WINS] ${wins}`, mistakes && `[MISTAKES] ${mistakes}`].filter(Boolean).join('\n');
    await onSave({ debrief, lessonsLearned: lessons, tiltLevel: tilt, emotionalState });
    setSaving(false); setVaultActive(true);
    setTimeout(() => { setVaultActive(false); setLocked(true); }, 3500);
  }, [wins, lessons, mistakes, tilt, emotionalState, onSave]);

  const updateEval = (tradeId: number, field: string, value: string) => {
    setTradeEvals(prev => ({ ...prev, [tradeId]: { ...(prev[tradeId] || { exec: 'OK', exit: 'Planned', deviation: 'None' }), [field]: value } }));
  };

  const tiltColor = tilt <= 2 ? '#86efac' : tilt <= 3 ? '#eab308' : '#ef4444';
  const tiltLabel = tilt <= 1 ? 'Calm' : tilt <= 2 ? 'Stable' : tilt <= 3 ? 'Mild Tilt' : tilt <= 4 ? 'Tilted' : 'Full Tilt';

  if (todayCompleted || locked) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🌙</div>
          <div style={{ fontSize: 28, fontWeight: 400, color: '#c4b5fd', fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>
            {isRTL ? 'הכספת ננעלה' : 'Vault Sealed'}
          </div>
          <div style={{ fontSize: 13, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'סיכום היום נשמר. מנוחה טובה.' : 'Daily debrief archived. Rest well.'}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, marginTop: 24, background: 'rgba(196,181,253,0.08)', border: '1px solid rgba(196,181,253,0.15)' }}>
            <span style={{ color: '#c4b5fd', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>VAULT SEALED ✓</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {vaultActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,6,20,0.97)', backdropFilter: 'blur(30px)' }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2; const r = 200;
              return (
                <motion.div key={i} initial={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r, opacity: 1, scale: 1 }}
                  animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  transition={{ duration: 1.5, delay: i * 0.03, ease: 'easeIn' }}
                  style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#c4b5fd', boxShadow: '0 0 8px #c4b5fd' }} />
              );
            })}
            <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: [2, 0.8, 1], opacity: [0, 1, 1] }} transition={{ duration: 1.5, delay: 0.5 }}
              style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#c4b5fd', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 30px rgba(196,181,253,0.5)' }}>
                VAULT SEALED
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                style={{ fontSize: 13, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace", marginTop: 10 }}>
                {todayPnl >= 0 ? `+$${todayPnl.toFixed(2)}` : `-$${Math.abs(todayPnl).toFixed(2)}`} • {todayTrades.length} trades
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 400, color: '#ede9fe', fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
            {isRTL ? '🌙 כספת סגירת יום' : '🌙 End-of-Day Vault'}
          </h2>
          <div style={{ fontSize: 12, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'סכם, למד, שחרר.' : 'Debrief, learn, release.'}
          </div>
        </div>

        {/* Session Summary */}
        <div style={{ ...GLASS, padding: 20, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: isRTL ? 'רווח/הפסד' : 'P&L', value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`, color: todayPnl >= 0 ? '#86efac' : '#fb7185' },
            { label: isRTL ? 'עסקאות' : 'Trades', value: String(todayTrades.length), color: '#c4b5fd' },
            { label: isRTL ? 'הצלחות' : 'Wins', value: String(todayTrades.filter(t => t.winLoss === 'Win').length), color: '#86efac' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 9, color: '#7c75a8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Trade Log with Intelligence Fields */}
        {todayTrades.length > 0 && (
          <div style={{ ...GLASS, padding: 28 }}>
            <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
              {isRTL ? 'יומן עסקאות — תיוג רגשי' : 'TRADE LOG — EMOTIONAL TAGGING'}
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
                      background: dragOver === `trade-${tr.id}` ? 'rgba(196,181,253,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${dragOver === `trade-${tr.id}` ? 'rgba(196,181,253,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12, padding: 18, transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                          background: tr.winLoss === 'Win' ? 'rgba(134,239,172,0.1)' : 'rgba(251,113,133,0.1)',
                          color: tr.winLoss === 'Win' ? '#86efac' : '#fb7185',
                          border: `1px solid ${tr.winLoss === 'Win' ? 'rgba(134,239,172,0.2)' : 'rgba(251,113,133,0.2)'}`,
                        }}>{tr.winLoss}</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#ede9fe', fontFamily: "'Playfair Display', serif" }}>{tr.coin}</span>
                        <span style={{ fontSize: 11, color: '#7c75a8', fontFamily: "'IBM Plex Mono', monospace" }}>{tr.direction} • {tr.returnR >= 0 ? '+' : ''}{tr.returnR.toFixed(2)}R</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: tr.pnl >= 0 ? '#86efac' : '#fb7185' }}>
                        {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                      </span>
                    </div>
                    {/* Intelligence Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                      {[
                        { field: 'exec', label: isRTL ? 'איכות ביצוע' : 'Execution', opts: ['Clean', 'OK', 'Weak'] as ExecutionQuality[], current: ev.exec, colors: { Clean: '#86efac', OK: '#eab308', Weak: '#fb7185' } },
                        { field: 'exit', label: isRTL ? 'איכות יציאה' : 'Exit', opts: ['Planned', 'Early', 'Forced'] as ExitQuality[], current: ev.exit, colors: { Planned: '#c4b5fd', Early: '#c4b5fd', Forced: '#c4b5fd' } },
                        { field: 'deviation', label: isRTL ? 'סטייה' : 'Deviation', opts: ['None', 'Minor', 'Major'] as PlanDeviation[], current: ev.deviation, colors: { None: '#86efac', Minor: '#eab308', Major: '#fb7185' } },
                      ].map(grp => (
                        <div key={grp.field}>
                          <div style={{ fontSize: 9, color: '#7c75a8', marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>{grp.label}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {grp.opts.map(v => {
                              const c = (grp.colors as any)[v] || '#c4b5fd';
                              return (
                                <button key={v} onClick={() => updateEval(tr.id, grp.field, v)} style={{
                                  flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                                  background: grp.current === v ? `${c}18` : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${grp.current === v ? `${c}40` : 'rgba(255,255,255,0.06)'}`,
                                  borderRadius: 6, cursor: 'pointer', color: grp.current === v ? c : '#7c75a8',
                                }}>{v}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {imgs.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {imgs.map((url, j) => <img key={j} src={url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }} />)}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: '#5b5580', marginTop: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {isRTL ? '↑ גרור צילומי מסך לכאן' : '↑ Drag screenshots here'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EOD Chart */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'גרף סוף יום' : 'EOD FINAL CHART'}
          </div>
          {eodChartUrl ? (
            <img src={eodChartUrl} alt="EOD Chart" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }} />
          ) : (
            <button onClick={() => eodFileRef.current?.click()} style={{
              width: '100%', padding: '30px 20px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: 12, cursor: 'pointer', color: '#7c75a8', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace",
            }}>📸 {isRTL ? 'העלה גרף סיכום יום' : 'Upload EOD chart screenshot'}</button>
          )}
          <input ref={eodFileRef} type="file" accept="image/*" onChange={handleEodChartUpload} style={{ display: 'none' }} />
        </div>

        {/* Post-Market Analysis */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'ניתוח פוסט-שוק' : 'POST-MARKET ANALYSIS'}
          </div>
          {[
            { key: 'wins', label: isRTL ? '✅ מה עבד?' : '✅ What Worked?', value: wins, setter: setWins, ph: isRTL ? 'הצלחות, תבניות טובות...' : 'Wins, good patterns...' },
            { key: 'lessons', label: isRTL ? '📖 מה השוק לימד?' : '📖 What Did the Market Teach?', value: lessons, setter: setLessons, ph: isRTL ? 'שיעורים, תובנות...' : 'Lessons, insights...' },
            { key: 'mistakes', label: isRTL ? '💀 טעויות (כנות ברוטלית)' : '💀 Mistakes (Brutal Honesty)', value: mistakes, setter: setMistakes, ph: isRTL ? 'מה היית עושה אחרת?' : 'What would you do differently?' },
          ].map(sec => (
            <div key={sec.key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#a5a0d0', marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>{sec.label}</div>
              <textarea value={sec.value} onChange={e => sec.setter(e.target.value)} placeholder={sec.ph} rows={3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#ede9fe', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", resize: 'vertical', outline: 'none', direction: isRTL ? 'rtl' : 'ltr' }} />
            </div>
          ))}
        </div>

        {/* Tilt Check */}
        <div style={{ ...GLASS, padding: 28 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRTL ? 'בדיקת טילט' : 'TILT CHECK'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#a5a0d0', fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'רמת טילט' : 'Tilt Level'}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: tiltColor, fontFamily: "'IBM Plex Mono', monospace" }}>{tilt}/5 — {tiltLabel}</span>
          </div>
          <input type="range" min={1} max={5} value={tilt} onChange={e => setTilt(Number(e.target.value))} style={{ width: '100%', accentColor: tiltColor }} />
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#a5a0d0', marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>{isRTL ? 'מצב רגשי' : 'Emotional State'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Focused', 'Confident', 'Anxious', 'Frustrated', 'Revenge', 'Euphoric', 'Exhausted', 'Neutral'].map(state => (
                <button key={state} onClick={() => setEmotionalState(state)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                  background: emotionalState === state ? 'rgba(196,181,253,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${emotionalState === state ? 'rgba(196,181,253,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: emotionalState === state ? '#c4b5fd' : '#7c75a8', cursor: 'pointer', transition: 'all 0.2s',
                }}>{state}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Seal Vault */}
        <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(196,181,253,0.12), rgba(168,139,250,0.08))',
            border: '1px solid rgba(196,181,253,0.2)', borderRadius: 14, color: '#c4b5fd',
            fontSize: 15, fontWeight: 600, fontFamily: "'Playfair Display', serif",
            cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.3s',
          }}>
          {saving ? (isRTL ? 'נועל כספת...' : 'Sealing Vault...') : (isRTL ? '🔒 נעל כספת סוף יום' : '🔒 Seal EOD Vault')}
        </motion.button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} />
    </>
  );
};
