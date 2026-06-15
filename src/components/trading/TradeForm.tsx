import { useState, useMemo, useEffect } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { GlassCard } from './TradingUI';
import { FeatureHint } from './FeatureHint';
import { useIsMobile } from '@/hooks/use-mobile';
import { haptics } from '@/lib/haptics';
import { checkRiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';

interface TradeFormProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  trade?: Trade | null;
  currentBalance: number;
  trades?: Trade[];
  onSave: (trade: Omit<Trade, 'id' | 'balance'>) => void;
  onClose: () => void;
}

const ASSET_CATEGORIES = {
  Crypto: ['BTC','ETH','SOL','SUI','ATOM','ALGO','ADA','XLM','OP','ONDO','IMX','POL','AVAX','DOT','LINK','ARB','APT','SEI','TIA','INJ'],
  Stocks: ['AAPL','TSLA','NVDA','MSFT','AMZN','GOOGL','META','NFLX','AMD','SPY'],
  Forex: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP','USD/CHF'],
  Futures: ['ES','NQ','YM','CL','GC','SI','ZB','RTY','MES','MNQ'],
  Options: [],
} as const;

type AssetCategory = keyof typeof ASSET_CATEGORIES;

const PIP_VALUES: Record<string, number> = {
  'EUR/USD': 0.0001, 'GBP/USD': 0.0001, 'AUD/USD': 0.0001, 'USD/CAD': 0.0001,
  'EUR/GBP': 0.0001, 'USD/CHF': 0.0001, 'USD/JPY': 0.01,
};

const TICK_VALUES: Record<string, { tick: number; value: number }> = {
  'ES': { tick: 0.25, value: 12.50 }, 'NQ': { tick: 0.25, value: 5.00 },
  'YM': { tick: 1, value: 5.00 }, 'CL': { tick: 0.01, value: 10.00 },
  'GC': { tick: 0.10, value: 10.00 }, 'SI': { tick: 0.005, value: 25.00 },
  'ZB': { tick: 1/32, value: 31.25 }, 'RTY': { tick: 0.10, value: 5.00 },
  'MES': { tick: 0.25, value: 1.25 }, 'MNQ': { tick: 0.25, value: 0.50 },
};

type StopMode = 'price' | 'pips' | 'percent' | 'dollar';

const detectCategory = (symbol: string): AssetCategory => {
  for (const [cat, symbols] of Object.entries(ASSET_CATEGORIES)) {
    if ((symbols as readonly string[]).includes(symbol)) return cat as AssetCategory;
  }
  return 'Crypto';
};

export const TradeForm = ({ T, t, isRTL, trade, currentBalance, onSave, onClose }: TradeFormProps) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0); // 0,1,2
  const [assetCategory, setAssetCategory] = useState<AssetCategory>(() => trade?.coin ? detectCategory(trade.coin) : 'Crypto');
  const [customSymbol, setCustomSymbol] = useState('');
  const [stopMode, setStopMode] = useState<StopMode>('price');
  const [stopPips, setStopPips] = useState(0);
  const [stopPercent, setStopPercent] = useState(0);
  const [stopDollar, setStopDollar] = useState(0);

  const [form, setForm] = useState({
    date: trade?.date || new Date().toISOString().slice(0, 16),
    day: trade?.day || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()],
    coin: trade?.coin || 'BTC',
    direction: trade?.direction || 'Long' as 'Long' | 'Short',
    orderType: trade?.orderType || 'Market',
    entry: trade?.entry || 0,
    stopLoss: trade?.stopLoss || 0,
    exit: trade?.exit || 0,
    risk: trade?.risk || 0,
    riskPct: trade?.riskPct || 1,
    leverage: trade?.leverage || 10,
    positionSize: trade?.positionSize || 0,
    rules: trade?.rules ?? true,
    comments: trade?.comments || '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const STEPS = [
    { title: isRTL ? 'מה סחרת ומתי' : 'What & When', sub: isRTL ? 'בחר את הנכס, הכיוון והזמן' : 'Pick asset, direction and time' },
    { title: isRTL ? 'מחירים וסיכון' : 'Prices & Risk', sub: isRTL ? 'הזן כניסה, סטופ ויציאה' : 'Enter prices and how much you risked' },
    { title: isRTL ? 'אישור ושמירה' : 'Review & Save', sub: isRTL ? 'בדוק את התוצאה ושמור' : 'Check the result and save' },
  ];

  const availableStopModes = useMemo(() => {
    const modes: { id: StopMode; label: string; hint: string }[] = [
      { id: 'price', label: isRTL ? 'מחיר' : 'Price', hint: isRTL ? 'מחיר הסטופ בדיוק' : 'Exact stop price' },
    ];
    if (assetCategory === 'Forex') modes.push({ id: 'pips', label: 'Pips', hint: isRTL ? 'מרחק בפיפים' : 'Distance in pips' });
    if (assetCategory === 'Futures') modes.push({ id: 'pips', label: 'Ticks', hint: isRTL ? 'מרחק בטיקים' : 'Distance in ticks' });
    modes.push({ id: 'percent', label: '%', hint: isRTL ? 'מרחק באחוזים' : 'Distance in %' });
    modes.push({ id: 'dollar', label: '$', hint: isRTL ? 'הפסד בדולרים' : 'Loss in $' });
    return modes;
  }, [assetCategory, isRTL]);

  const computeStopFromMode = (entry: number, mode: StopMode, value: number, direction: string, coin: string): number => {
    if (mode === 'price') return value;
    const sign = direction === 'Long' ? -1 : 1;
    if (mode === 'pips') {
      const pipVal = PIP_VALUES[coin] || TICK_VALUES[coin]?.tick || 0.01;
      return entry + sign * value * pipVal;
    }
    if (mode === 'percent') return entry * (1 + sign * value / 100);
    if (mode === 'dollar' && entry > 0) return entry + sign * (value / (form.positionSize || 1));
    return entry;
  };

  const autoCalcPositionSize = useMemo(() => {
    const { entry, stopLoss, risk } = form;
    if (!entry || !stopLoss || !risk || entry === stopLoss) return 0;
    return risk / Math.abs(entry - stopLoss);
  }, [form.entry, form.stopLoss, form.risk]);

  const equivPercent = useMemo(() => currentBalance > 0 ? (form.risk / currentBalance) * 100 : 0, [currentBalance, form.risk]);

  const handleDateChange = (val: string) => {
    const d = new Date(val);
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    setForm(f => ({ ...f, date: val, day }));
  };

  const handleSymbolSelect = (symbol: string) => {
    setForm(f => ({ ...f, coin: symbol }));
    setCustomSymbol('');
    if (PIP_VALUES[symbol] || TICK_VALUES[symbol]) setStopMode('pips');
  };

  const handleCustomSymbol = (val: string) => {
    setCustomSymbol(val);
    setForm(f => ({ ...f, coin: val.trim() ? val.trim().toUpperCase() : '' }));
  };

  const handleStopModeChange = (mode: StopMode) => {
    setStopMode(mode);
    if (mode === 'price') return;
    const val = mode === 'pips' ? stopPips : mode === 'percent' ? stopPercent : stopDollar;
    if (val && form.entry) {
      const newStop = computeStopFromMode(form.entry, mode, val, form.direction, form.coin);
      setForm(f => ({ ...f, stopLoss: +newStop.toFixed(8) }));
    }
  };

  const handleStopValueChange = (val: number) => {
    if (stopMode === 'pips') setStopPips(val);
    else if (stopMode === 'percent') setStopPercent(val);
    else if (stopMode === 'dollar') setStopDollar(val);
    if (form.entry && val) {
      const newStop = computeStopFromMode(form.entry, stopMode, val, form.direction, form.coin);
      setForm(f => ({ ...f, stopLoss: +newStop.toFixed(8) }));
    }
  };

  const handleRiskChange = (val: number) => {
    setForm(f => ({ ...f, risk: val, riskPct: currentBalance > 0 ? (val / currentBalance) * 100 : 0 }));
  };

  const calc = () => {
    const { entry, stopLoss, exit, risk, direction } = form;
    if (!entry || !stopLoss || !exit) return { returnR: 0, pnl: 0, winLoss: 'Break Even' as const, expectedLoss: 0, deviation: 0 };
    const riskPerUnit = Math.abs(entry - stopLoss);
    const actualMove = direction === 'Long' ? exit - entry : entry - exit;
    const returnR = riskPerUnit > 0 ? actualMove / riskPerUnit : 0;
    const expectedLoss = risk * 0.975;
    const pnl = returnR * risk;
    const winLoss: Trade['winLoss'] = pnl > 0.05 ? 'Win' : pnl < -0.05 ? 'Loss' : 'Break Even';
    const deviation = returnR < 0 ? Math.max(0, Math.abs(returnR) - 1) : 0;
    return { returnR, pnl, winLoss, expectedLoss, deviation };
  };

  const validateStep = (s: number): string[] => {
    const errs: string[] = [];
    if (s >= 0) {
      if (!form.coin.trim()) errs.push(isRTL ? 'בחר נכס' : 'Pick an asset');
    }
    if (s >= 1) {
      if (!form.entry) errs.push(isRTL ? 'מחיר כניסה חסר' : 'Entry price required');
      if (!form.stopLoss) errs.push(isRTL ? 'סטופ לוס חסר' : 'Stop loss required');
      if (!form.exit) errs.push(isRTL ? 'מחיר יציאה חסר' : 'Exit price required');
      if (form.risk <= 0) errs.push(isRTL ? 'סכום סיכון חייב להיות גדול מ-0' : 'Risk amount must be greater than 0');
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep(s => Math.min(2, s + 1));
  };

  const handleBack = () => { setErrors([]); setStep(s => Math.max(0, s - 1)); };

  const handleSubmit = () => {
    const errs = validateStep(1);
    if (errs.length) { setErrors(errs); setStep(1); return; }
    const { returnR, pnl, winLoss, expectedLoss, deviation } = calc();
    onSave({
      date: form.date, day: form.day, coin: form.coin, direction: form.direction, orderType: form.orderType,
      entry: form.entry, stopLoss: form.stopLoss, exit: form.exit, returnR, winLoss, risk: form.risk,
      expectedLoss, pnl, deviation, positionSize: form.positionSize || autoCalcPositionSize, leverage: form.leverage,
      riskPct: form.riskPct, rules: form.rules, comments: form.comments,
    } as Omit<Trade, 'id' | 'balance'>);
  };

  const { returnR, pnl, winLoss } = calc();

  // ── Big, friendly styles ──
  const bigInput = {
    width: '100%', padding: isMobile ? '14px 14px' : '13px 14px',
    background: T.bg.tertiary, border: `1.5px solid ${T.border.medium}`,
    borderRadius: 12, color: T.text.primary,
    fontSize: isMobile ? 16 : 15, fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as const;
  const bigLabel = {
    fontSize: isMobile ? 14 : 13, color: T.text.primary, fontWeight: 600,
    marginBottom: 6, display: 'block',
  } as const;
  const helpText = {
    fontSize: 12, color: T.text.muted, marginTop: 6, lineHeight: 1.5,
  } as const;
  const categoryColors: Record<AssetCategory, string> = { Crypto: T.accent.cyan, Stocks: T.accent.green, Forex: T.accent.purple, Futures: T.accent.orange, Options: T.accent.blue };

  const sectionCard = {
    padding: isMobile ? 16 : 18,
    borderRadius: 16,
    background: `${T.bg.tertiary}66`,
    border: `1px solid ${T.border.subtle}`,
    marginBottom: 14,
  } as const;

  const panelStyle = {
    background: `linear-gradient(145deg, ${T.bg.card} 0%, ${T.bg.secondary} 52%, ${T.bg.tertiary} 100%)`,
    border: `1px solid ${T.border.medium}`,
    borderRadius: isMobile ? `20px 20px 0 0` : `20px`,
    padding: 0,
    maxWidth: isMobile ? '100%' : 720,
    width: isMobile ? '100%' : '95%',
    maxHeight: isMobile ? '94vh' : '92vh',
    overflow: 'hidden',
    boxShadow: `0 28px 90px rgba(0,0,0,0.6), 0 0 0 1px ${T.accent.cyan}18 inset`,
    animation: 'scaleIn 0.18s ease',
    display: 'flex', flexDirection: 'column' as const,
  };

  // Step indicator pill
  const StepDot = ({ idx }: { idx: number }) => {
    const active = idx === step;
    const done = idx < step;
    const color = done ? T.accent.green : active ? T.accent.cyan : T.text.muted;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: done || active ? `${color}20` : T.bg.tertiary,
          border: `2px solid ${color}`,
          color, fontSize: 13, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {done ? '✓' : idx + 1}
        </div>
        {!isMobile && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: active ? T.text.primary : T.text.muted, lineHeight: 1.1 }}>{STEPS[idx].title}</div>
          </div>
        )}
      </div>
    );
  };

  // Guard against accidental backdrop dismiss that wipes the in-progress trade.
  const isDirty = form.coin !== (trade?.coin || 'BTC') || form.entry || form.stopLoss || form.exit || form.risk || form.comments;
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const safeClose = () => {
    if (isDirty && !trade) {
      setShowExitConfirm(true);
      return;
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backdropFilter: 'blur(14px)', padding: isMobile ? 0 : 18 }} onClick={safeClose}>
      <div onClick={e => e.stopPropagation()} style={panelStyle}>

        {/* Header */}
        <div style={{ padding: isMobile ? '18px 18px 14px' : '22px 26px 16px', borderBottom: `1px solid ${T.border.subtle}`, background: `linear-gradient(90deg, ${T.accent.cyan}10, transparent 45%)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: T.text.primary, lineHeight: 1.1 }}>{trade ? t.editTrade : (isRTL ? 'הוספת עסקה חדשה' : 'Add a New Trade')}</div>
              <div style={{ fontSize: 13, color: T.text.secondary, marginTop: 6 }}>{STEPS[step].sub}</div>
            </div>
            <button onClick={safeClose} aria-label="Close" style={{ width: 38, height: 38, borderRadius: 12, background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, color: T.text.secondary, fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ display: 'contents' }}>
                <StepDot idx={i} />
                {i < 2 && <div style={{ height: 2, background: i < step ? T.accent.green : T.border.medium, flex: isMobile ? 1 : 0, minWidth: isMobile ? 0 : 24 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '16px 18px 18px' : '20px 26px 22px', overflow: 'auto', flex: 1 }}>

          {errors.length > 0 && (
            <div style={{ padding: 12, background: `${T.accent.red}15`, border: `1.5px solid ${T.accent.red}50`, borderRadius: 12, marginBottom: 14, fontSize: 13, color: T.accent.red, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <div>{errors.join(' • ')}</div>
            </div>
          )}

          {/* ─── STEP 1: Asset, Date, Direction ─── */}
          {step === 0 && (
            <>
              <FeatureHint
                T={T}
                id="trade-form-wizard-intro"
                text={isRTL
                  ? 'הוספת עסקה ב-3 שלבים: נכס וזמן → מחירים וסיכון → סקירה ושמירה. הנתונים שלך נשמרים בזיכרון עד שתלחץ "שמור" — לחיצה מחוץ למסך תבקש אישור לפני מחיקת הטיוטה.'
                  : 'Add a trade in 3 steps: Asset & time → Prices & risk → Review & save. Your draft is held in memory until you click Save — clicking outside will ask before discarding.'}
              />
              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? '1. איזה סוג נכס סחרת?' : '1. What type of asset did you trade?'}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map(cat => (
                    <button key={cat} onClick={() => { setAssetCategory(cat); if (ASSET_CATEGORIES[cat].length > 0) setForm(f => ({ ...f, coin: ASSET_CATEGORIES[cat][0] })); }}
                      style={{ padding: isMobile ? '12px 18px' : '10px 18px', border: `1.5px solid ${assetCategory === cat ? categoryColors[cat] : T.border.medium}`, borderRadius: 12, background: assetCategory === cat ? `${categoryColors[cat]}18` : T.bg.tertiary, color: assetCategory === cat ? categoryColors[cat] : T.text.secondary, cursor: 'pointer', fontSize: isMobile ? 14 : 13, fontWeight: 700, transition: 'all 0.2s' }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div style={helpText}>{isRTL ? 'בחר את הקטגוריה שמתאימה לנכס שסחרת.' : 'Pick the category that matches the instrument you traded.'}</div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? '2. מהו הסימול?' : '2. What is the symbol?'}</label>
                <input type="text" placeholder={isRTL ? 'לדוגמה: BTC, AAPL, EUR/USD...' : 'e.g. BTC, AAPL, EUR/USD...'} value={customSymbol || form.coin} onChange={e => handleCustomSymbol(e.target.value)} style={bigInput} />
                {ASSET_CATEGORIES[assetCategory].length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                    {ASSET_CATEGORIES[assetCategory].map(s => (
                      <button key={s} onClick={() => handleSymbolSelect(s)} style={{ padding: isMobile ? '8px 12px' : '6px 12px', border: `1px solid ${form.coin === s ? categoryColors[assetCategory] : T.border.subtle}`, borderRadius: 8, background: form.coin === s ? `${categoryColors[assetCategory]}15` : 'transparent', color: form.coin === s ? categoryColors[assetCategory] : T.text.muted, cursor: 'pointer', fontSize: isMobile ? 12 : 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, transition: 'all 0.15s' }}>{s}</button>
                    ))}
                  </div>
                )}
                <div style={helpText}>{isRTL ? 'תוכל להקליד כל סימול חופשי או לבחור מהרשימה למטה.' : 'Type any symbol freely, or pick one from the list below.'}</div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? '3. מתי ביצעת את העסקה?' : '3. When did you make this trade?'}</label>
                <input type="datetime-local" value={form.date} onChange={e => handleDateChange(e.target.value)} style={bigInput} />
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? '4. כיוון העסקה' : '4. Trade direction'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['Long','Short'] as const).map(d => (
                    <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                      style={{ padding: isMobile ? '16px' : '14px', border: `2px solid ${form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.border.medium}`, borderRadius: 14, background: form.direction === d ? `${d === 'Long' ? T.accent.green : T.accent.red}15` : T.bg.tertiary, color: form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.text.secondary, cursor: 'pointer', fontSize: isMobile ? 15 : 14, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 22 }}>{d === 'Long' ? '↑' : '↓'}</span>
                      <span>{d === 'Long' ? (isRTL ? 'לונג (קנייה)' : 'Long (Buy)') : (isRTL ? 'שורט (מכירה)' : 'Short (Sell)')}</span>
                      <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>{d === 'Long' ? (isRTL ? 'הימור על עלייה' : 'Bet on going up') : (isRTL ? 'הימור על ירידה' : 'Bet on going down')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? '5. סוג הוראה' : '5. Order type'}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Market','Limit','Stop'].map(o => (
                    <button key={o} onClick={() => setForm(f => ({ ...f, orderType: o }))}
                      style={{ flex: 1, padding: isMobile ? '12px' : '11px', border: `1.5px solid ${form.orderType === o ? T.accent.cyan : T.border.medium}`, borderRadius: 12, background: form.orderType === o ? `${T.accent.cyan}15` : T.bg.tertiary, color: form.orderType === o ? T.accent.cyan : T.text.secondary, cursor: 'pointer', fontSize: isMobile ? 14 : 13, fontWeight: 600 }}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── STEP 2: Prices & Risk ─── */}
          {step === 1 && (
            <>
              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? 'מחיר הכניסה' : 'Entry price'}</label>
                <input type="number" step="any" inputMode="decimal" value={form.entry || ''} onChange={e => setForm(f => ({ ...f, entry: +e.target.value }))} placeholder="0.00" style={bigInput} />
                <div style={helpText}>{isRTL ? 'המחיר בו פתחת את העסקה.' : 'The price you opened the trade at.'}</div>
              </div>

              <div style={sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ ...bigLabel, marginBottom: 0 }}>{isRTL ? 'סטופ לוס (היכן יצאת אם טעית)' : 'Stop loss (your safety exit)'}</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {availableStopModes.map(m => (
                      <button key={m.id} onClick={() => handleStopModeChange(m.id)}
                        style={{ padding: '6px 10px', border: `1.5px solid ${stopMode === m.id ? T.accent.orange : T.border.medium}`, borderRadius: 8, background: stopMode === m.id ? `${T.accent.orange}15` : T.bg.tertiary, color: stopMode === m.id ? T.accent.orange : T.text.muted, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {stopMode === 'price' ? (
                  <input type="number" step="any" inputMode="decimal" value={form.stopLoss || ''} onChange={e => setForm(f => ({ ...f, stopLoss: +e.target.value }))} placeholder="0.00" style={bigInput} />
                ) : (
                  <>
                    <input type="number" step="any" inputMode="decimal"
                      value={stopMode === 'pips' ? (stopPips || '') : stopMode === 'percent' ? (stopPercent || '') : (stopDollar || '')}
                      onChange={e => handleStopValueChange(+e.target.value)}
                      placeholder={stopMode === 'pips' ? (assetCategory === 'Futures' ? 'Ticks' : 'Pips') : stopMode === 'percent' ? '%' : '$'}
                      style={bigInput} />
                    {form.stopLoss > 0 && (
                      <div style={{ fontSize: 12, color: T.accent.cyan, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                        → {isRTL ? 'מחיר סטופ:' : 'Stop price:'} {form.stopLoss.toFixed(form.stopLoss < 1 ? 5 : 2)}
                      </div>
                    )}
                  </>
                )}
                <div style={helpText}>{isRTL ? 'המחיר שבו תצא מהעסקה אם השוק הולך נגדך — להגנה על ההון.' : "The price you'll exit if the market moves against you — to protect your capital."}</div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? 'מחיר היציאה' : 'Exit price'}</label>
                <input type="number" step="any" inputMode="decimal" value={form.exit || ''} onChange={e => setForm(f => ({ ...f, exit: +e.target.value }))} placeholder="0.00" style={bigInput} />
                <div style={helpText}>{isRTL ? 'המחיר שבו סגרת את העסקה בפועל.' : 'The price you actually closed at.'}</div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? 'כמה הסתכנת? (בדולרים)' : 'How much did you risk? ($)'}</label>

                {/* R-Multiple chips — pick risk as % of balance with one tap */}
                {currentBalance > 0 && (
                  <div
                    role="radiogroup"
                    aria-label={isRTL ? 'אחוז סיכון מהירים' : 'Quick risk percentage'}
                    style={{
                      display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap',
                    }}
                  >
                    {[0.25, 0.5, 1, 1.5, 2].map(pct => {
                      const dollar = +((currentBalance * pct) / 100).toFixed(2);
                      const active = Math.abs(equivPercent - pct) < 0.05;
                      return (
                        <button
                          key={pct}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => { haptics.selection(); handleRiskChange(dollar); }}
                          className="orca-press"
                          style={{
                            flex: '1 1 auto',
                            minWidth: 56,
                            minHeight: 44,
                            padding: '8px 10px',
                            borderRadius: T.radius.md,
                            border: `1px solid ${active ? T.accent.cyan : T.border.medium}`,
                            background: active
                              ? `linear-gradient(135deg, ${T.accent.cyan}22, ${T.accent.teal}18)`
                              : T.bg.tertiary,
                            color: active ? T.accent.cyan : T.text.secondary,
                            cursor: 'pointer',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            fontSize: 13,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            boxShadow: active ? `0 0 0 1px ${T.accent.cyan}55, 0 0 14px ${T.accent.cyan}25` : 'none',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'border-color 0.18s, background 0.18s, color 0.18s, box-shadow 0.18s',
                          }}
                        >
                          <span>{pct}%</span>
                          <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.75 }}>
                            ${dollar.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <input
                  type="number" step="any" inputMode="decimal"
                  value={form.risk || ''}
                  onChange={e => handleRiskChange(+e.target.value)}
                  placeholder={isRTL ? 'סכום בדולרים' : 'Amount in $'}
                  style={bigInput}
                />
                <div style={helpText}>
                  {`${isRTL ? 'שווה ערך ל-' : 'Equivalent to '}${equivPercent.toFixed(2)}% ${isRTL ? 'מההון' : 'of your balance'} ${currentBalance > 0 ? `($${currentBalance.toFixed(0)})` : ''}`}
                </div>
              </div>

              <div style={sectionCard}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={bigLabel}>{isRTL ? 'מינוף' : 'Leverage'}</label>
                    <input type="number" inputMode="numeric" value={form.leverage} onChange={e => setForm(f => ({ ...f, leverage: +e.target.value }))} style={bigInput} />
                  </div>
                  <div>
                    <label style={bigLabel}>{isRTL ? 'גודל פוזיציה' : 'Position size'}</label>
                    <input type="number" step="any" inputMode="decimal" value={form.positionSize || ''} onChange={e => setForm(f => ({ ...f, positionSize: +e.target.value }))} placeholder={isRTL ? 'אופציונלי' : 'Optional'} style={bigInput} />
                    {autoCalcPositionSize > 0 && !form.positionSize && (
                      <button onClick={() => setForm(f => ({ ...f, positionSize: +autoCalcPositionSize.toFixed(4) }))}
                        style={{ fontSize: 12, color: T.accent.cyan, background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0, fontWeight: 600 }}>
                        ✨ {isRTL ? 'חשב אוטומטית:' : 'Auto-fill:'} {autoCalcPositionSize.toFixed(4)}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={sectionCard}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: T.text.primary, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.checked }))} style={{ accentColor: T.accent.cyan, width: 18, height: 18 }} />
                  {isRTL ? 'עקבתי אחר חוקי המסחר שלי' : 'I followed my trading rules'}
                </label>
                <div style={helpText}>{isRTL ? 'סמן אם פעלת לפי האסטרטגיה והכללים שהגדרת לעצמך.' : 'Check this if you stuck to your strategy and rules.'}</div>
              </div>

              <div style={sectionCard}>
                <label style={bigLabel}>{isRTL ? 'הערות (אופציונלי)' : 'Notes (optional)'}</label>
                <textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder={isRTL ? 'מה למדת? איך הרגשת? מה הסיבה לעסקה?' : 'What did you learn? How did you feel? Why this trade?'} style={{ ...bigInput, minHeight: 80, resize: 'vertical', fontFamily: "'Inter', system-ui, sans-serif" }} />
              </div>
            </>
          )}

          {/* ─── STEP 3: Review ─── */}
          {step === 2 && (
            <>
              <GlassCard T={T} style={{ marginBottom: 16, padding: isMobile ? 18 : 22 }}>
                <div style={{ fontSize: 12, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontWeight: 700 }}>{isRTL ? 'סיכום העסקה' : 'Trade summary'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'נכס' : 'Asset'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{form.coin}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'כיוון' : 'Direction'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: form.direction === 'Long' ? T.accent.green : T.accent.red }}>{form.direction === 'Long' ? '↑ Long' : '↓ Short'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'כניסה / יציאה' : 'Entry / Exit'}</div>
                    <div style={{ fontSize: 14, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{form.entry} → {form.exit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'סטופ לוס' : 'Stop loss'}</div>
                    <div style={{ fontSize: 14, color: T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{form.stopLoss}</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard T={T} style={{ marginBottom: 18, padding: isMobile ? 18 : 22, background: pnl >= 0 ? `${T.accent.green}10` : `${T.accent.red}10`, border: `2px solid ${pnl >= 0 ? T.accent.green : T.accent.red}40` }}>
                <div style={{ fontSize: 12, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontWeight: 700 }}>{isRTL ? 'התוצאה' : 'Result'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>R-Multiple</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: returnR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{returnR.toFixed(2)}R</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>P&L</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'תוצאה' : 'Outcome'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: winLoss === 'Win' ? T.accent.green : winLoss === 'Loss' ? T.accent.red : T.accent.orange }}>{winLoss === 'Win' ? (isRTL ? 'רווח' : 'Win') : winLoss === 'Loss' ? (isRTL ? 'הפסד' : 'Loss') : 'Break-even'}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border.subtle}`, fontSize: 12, color: T.text.secondary }}>
                  {isRTL ? 'יתרה לאחר עסקה זו: ' : 'Balance after this trade: '}
                  <span style={{ color: T.text.primary, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>${(currentBalance + pnl).toFixed(2)}</span>
                </div>
              </GlassCard>

              <div style={{ fontSize: 12, color: T.text.muted, textAlign: 'center', marginBottom: 6 }}>
                {isRTL ? 'בדוק את הנתונים. כדי לתקן — חזור אחורה.' : 'Review the details. Hit Back to make changes.'}
              </div>
            </>
          )}
        </div>

        {/* Footer / Nav buttons */}
        <div style={{ padding: isMobile ? '14px 18px' : '16px 26px', borderTop: `1px solid ${T.border.subtle}`, background: T.bg.secondary, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={step === 0 ? safeClose : handleBack}
            style={{ padding: isMobile ? '13px 22px' : '12px 22px', background: T.bg.tertiary, border: `1.5px solid ${T.border.medium}`, borderRadius: 12, color: T.text.secondary, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {step === 0 ? (isRTL ? 'ביטול' : 'Cancel') : (isRTL ? '← חזור' : '← Back')}
          </button>
          <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? `שלב ${step + 1} מתוך 3` : `Step ${step + 1} of 3`}</div>
          {step < 2 ? (
            <button onClick={handleNext}
              style={{ padding: isMobile ? '13px 28px' : '12px 28px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: 12, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {isRTL ? 'המשך →' : 'Continue →'}
            </button>
          ) : (
            <button onClick={handleSubmit}
              style={{ padding: isMobile ? '13px 28px' : '12px 28px', background: `linear-gradient(135deg, ${T.accent.green}, ${T.accent.teal})`, border: 'none', borderRadius: 12, color: T.bg.primary, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
              ✓ {isRTL ? 'שמור עסקה' : 'Save Trade'}
            </button>
          )}
        </div>
      </div>

      {showExitConfirm && (
        <div
          onClick={() => setShowExitConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(2, 8, 20, 0.78)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, animation: 'tfFadeIn 0.18s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              width: '100%', maxWidth: 420,
              background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
              border: `1px solid ${T.border.medium}`, borderRadius: 18,
              padding: 26, boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${T.accent.orange}25`,
              animation: 'tfScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              {isRTL ? 'שינויים לא נשמרו' : 'Unsaved changes'}
            </div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6, marginBottom: 22 }}>
              {isRTL
                ? 'יש לך נתוני עסקה שלא נשמרו. אם תצא עכשיו, הטיוטה תימחק.'
                : 'You have unsaved trade data. Leaving now will discard this draft.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 700,
                  background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                  border: 'none', borderRadius: 10, color: T.bg.primary, cursor: 'pointer',
                }}
              >
                {isRTL ? 'המשך עריכה' : 'Keep Editing'}
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onClose(); }}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 700,
                  background: `${T.accent.red}15`, border: `1px solid ${T.accent.red}55`,
                  borderRadius: 10, color: T.accent.red, cursor: 'pointer',
                }}
              >
                {isRTL ? 'מחק טיוטה' : 'Discard Changes'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes tfFadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes tfScaleIn { from { opacity: 0; transform: scale(0.94) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
          `}</style>
        </div>
      )}
    </div>
  );
};
