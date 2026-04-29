import { useState, useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { GlassCard } from './TradingUI';
import { useIsMobile } from '@/hooks/use-mobile';

interface TradeFormProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  trade?: Trade | null;
  currentBalance: number;
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

// Pip values for common forex pairs
const PIP_VALUES: Record<string, number> = {
  'EUR/USD': 0.0001, 'GBP/USD': 0.0001, 'AUD/USD': 0.0001, 'USD/CAD': 0.0001,
  'EUR/GBP': 0.0001, 'USD/CHF': 0.0001, 'USD/JPY': 0.01,
};

// Tick values for futures
const TICK_VALUES: Record<string, { tick: number; value: number }> = {
  'ES': { tick: 0.25, value: 12.50 }, 'NQ': { tick: 0.25, value: 5.00 },
  'YM': { tick: 1, value: 5.00 }, 'CL': { tick: 0.01, value: 10.00 },
  'GC': { tick: 0.10, value: 10.00 }, 'SI': { tick: 0.005, value: 25.00 },
  'ZB': { tick: 1/32, value: 31.25 }, 'RTY': { tick: 0.10, value: 5.00 },
  'MES': { tick: 0.25, value: 1.25 }, 'MNQ': { tick: 0.25, value: 0.50 },
};

type StopMode = 'price' | 'pips' | 'percent' | 'dollar';
type RiskMode = 'dollar' | 'percent';

const detectCategory = (symbol: string): AssetCategory => {
  for (const [cat, symbols] of Object.entries(ASSET_CATEGORIES)) {
    if ((symbols as readonly string[]).includes(symbol)) return cat as AssetCategory;
  }
  return 'Crypto';
};

export const TradeForm = ({ T, t, isRTL, trade, currentBalance, onSave, onClose }: TradeFormProps) => {
  const isMobile = useIsMobile();
  const [assetCategory, setAssetCategory] = useState<AssetCategory>(() => trade?.coin ? detectCategory(trade.coin) : 'Crypto');
  const [customSymbol, setCustomSymbol] = useState('');
  const [stopMode, setStopMode] = useState<StopMode>('price');
  const [riskMode, setRiskMode] = useState<RiskMode>('dollar');
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

  // Auto-detect best stop mode based on asset category
  const availableStopModes = useMemo(() => {
    const modes: { id: StopMode; label: string }[] = [
      { id: 'price', label: isRTL ? 'מחיר' : 'Price' },
    ];
    if (assetCategory === 'Forex') {
      modes.push({ id: 'pips', label: 'Pips' });
    }
    if (assetCategory === 'Futures') {
      modes.push({ id: 'pips', label: 'Ticks' });
    }
    modes.push({ id: 'percent', label: '%' });
    modes.push({ id: 'dollar', label: '$' });
    return modes;
  }, [assetCategory, isRTL]);

  // Convert stop mode to actual stop loss price
  const computeStopFromMode = (entry: number, mode: StopMode, value: number, direction: string, coin: string): number => {
    if (mode === 'price') return value;
    const sign = direction === 'Long' ? -1 : 1;
    if (mode === 'pips') {
      const pipVal = PIP_VALUES[coin] || TICK_VALUES[coin]?.tick || 0.01;
      return entry + sign * value * pipVal;
    }
    if (mode === 'percent') {
      return entry * (1 + sign * value / 100);
    }
    if (mode === 'dollar' && entry > 0) {
      // dollar risk -> need position size to compute stop, use approximate
      return entry + sign * (value / (form.positionSize || 1));
    }
    return entry;
  };

  // Auto-calculate position size from risk
  const autoCalcPositionSize = useMemo(() => {
    const { entry, stopLoss, risk } = form;
    if (!entry || !stopLoss || !risk || entry === stopLoss) return 0;
    const riskPerUnit = Math.abs(entry - stopLoss);
    return risk / riskPerUnit;
  }, [form.entry, form.stopLoss, form.risk]);

  // Auto-calculate dollar risk from percent
  const riskFromPercent = useMemo(() => {
    return currentBalance * (form.riskPct / 100);
  }, [currentBalance, form.riskPct]);

  const handleDateChange = (val: string) => {
    const d = new Date(val);
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    setForm(f => ({ ...f, date: val, day }));
  };

  const handleSymbolSelect = (symbol: string) => {
    setForm(f => ({ ...f, coin: symbol }));
    setCustomSymbol('');
    // Auto-set best stop mode
    if (PIP_VALUES[symbol]) setStopMode('pips');
    else if (TICK_VALUES[symbol]) setStopMode('pips');
  };

  const handleCustomSymbol = (val: string) => {
    setCustomSymbol(val);
    if (val.trim()) setForm(f => ({ ...f, coin: val.trim().toUpperCase() }));
  };

  const handleStopModeChange = (mode: StopMode) => {
    setStopMode(mode);
    if (mode === 'price') return;
    // Recompute stop when mode changes
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

  const handleRiskModeToggle = () => {
    if (riskMode === 'dollar') {
      setRiskMode('percent');
      setForm(f => ({ ...f, risk: riskFromPercent }));
    } else {
      setRiskMode('dollar');
    }
  };

  const handleRiskChange = (val: number) => {
    if (riskMode === 'percent') {
      setForm(f => ({ ...f, riskPct: val, risk: currentBalance * (val / 100) }));
    } else {
      setForm(f => ({ ...f, risk: val, riskPct: currentBalance > 0 ? (val / currentBalance) * 100 : 0 }));
    }
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

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!form.coin.trim()) errs.push(isRTL ? 'סימול חסר' : 'Symbol required');
    if (!form.entry) errs.push(isRTL ? 'כניסה חסרה' : 'Entry required');
    if (!form.stopLoss) errs.push(isRTL ? 'סטופ לוס חסר' : 'Stop loss required');
    if (!form.exit) errs.push(isRTL ? 'יציאה חסרה' : 'Exit required');
    if (form.risk <= 0) errs.push(isRTL ? 'סיכון חייב להיות חיובי' : 'Risk must be positive');
    if (errs.length > 0) { setErrors(errs); return; }
    const { returnR, pnl, winLoss, expectedLoss, deviation } = calc();
    onSave({
      date: form.date, day: form.day, coin: form.coin, direction: form.direction, orderType: form.orderType,
      entry: form.entry, stopLoss: form.stopLoss, exit: form.exit, returnR, winLoss, risk: form.risk,
      expectedLoss, pnl, deviation, positionSize: form.positionSize || autoCalcPositionSize, leverage: form.leverage,
      riskPct: form.riskPct, rules: form.rules, comments: form.comments,
    } as Omit<Trade, 'id' | 'balance'>);
  };

  const { returnR, pnl, winLoss } = calc();

  const inputStyle = {
    width: '100%', padding: isMobile ? '10px 10px' : '8px 10px',
    background: T.bg.tertiary, border: `1px solid ${T.border.medium}`,
    borderRadius: T.radius.sm, color: T.text.primary,
    fontSize: isMobile ? 14 : 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none',
  };
  const labelStyle = { fontSize: isMobile ? 10 : 9, color: T.text.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, display: 'block' };
  const categoryColors: Record<AssetCategory, string> = { Crypto: T.accent.cyan, Stocks: T.accent.green, Forex: T.accent.purple, Futures: T.accent.orange, Options: T.accent.blue };

  const modeBtnStyle = (active: boolean, color: string) => ({
    padding: isMobile ? '6px 10px' : '4px 8px',
    border: `1px solid ${active ? color : T.border.medium}`,
    borderRadius: T.radius.sm,
    background: active ? `${color}15` : T.bg.tertiary,
    color: active ? color : T.text.muted,
    cursor: 'pointer' as const,
    fontSize: isMobile ? 11 : 10,
    fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
  });

  const panelStyle = {
    background: `linear-gradient(145deg, ${T.bg.card} 0%, ${T.bg.secondary} 52%, ${T.bg.tertiary} 100%)`,
    border: `1px solid ${T.border.medium}`,
    borderRadius: isMobile ? `${T.radius.xl}px ${T.radius.xl}px 0 0` : `${T.radius.xl}px`,
    padding: 0,
    maxWidth: isMobile ? '100%' : 760,
    width: isMobile ? '100%' : '95%',
    maxHeight: isMobile ? '92vh' : '90vh',
    overflow: 'hidden',
    boxShadow: `0 28px 90px rgba(0,0,0,0.58), 0 0 0 1px ${T.accent.cyan}18 inset`,
    animation: 'scaleIn 0.18s ease',
  } as const;

  const sectionStyle = {
    padding: isMobile ? 12 : 14,
    borderRadius: 14,
    background: `${T.bg.tertiary}88`,
    border: `1px solid ${T.border.subtle}`,
    marginBottom: 12,
  } as const;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.76)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backdropFilter: 'blur(14px)', padding: isMobile ? 0 : 18 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={panelStyle}>
        {/* Header */}
        <div style={{ padding: isMobile ? '16px 16px 12px' : '20px 24px 14px', borderBottom: `1px solid ${T.border.subtle}`, background: `linear-gradient(90deg, ${T.accent.cyan}10, transparent 45%)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: T.accent.cyan, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                {isRTL ? 'קליטת עסקה מודרכת' : 'Guided Trade Entry'}
              </div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: T.text.primary }}>{trade ? t.editTrade : t.addTrade}</div>
              <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 4 }}>{isRTL ? 'כל השדות המתקדמים נשמרו — רק הסדר והבהירות שודרגו.' : 'All advanced fields preserved — clearer flow.'}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, color: T.text.secondary, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {[(isRTL ? '1 · נכס וזמן' : '1 · Asset & Time'), (isRTL ? '2 · כניסה וסיכון' : '2 · Entry & Risk'), (isRTL ? '3 · בדיקה ושמירה' : '3 · Review & Save')].map((step, i) => (
              <div key={step} style={{ padding: '8px 10px', borderRadius: 10, background: i === 0 ? `${T.accent.cyan}13` : `${T.bg.tertiary}88`, border: `1px solid ${i === 0 ? T.accent.cyan : T.border.subtle}30`, color: i === 0 ? T.accent.cyan : T.text.muted, fontSize: 11, fontWeight: 700 }}>
                {step}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: isMobile ? '14px 16px 18px' : '18px 24px 22px', overflow: 'auto', maxHeight: isMobile ? 'calc(92vh - 132px)' : 'calc(90vh - 148px)' }}>

        {errors.length > 0 && <div style={{ padding: 10, background: `${T.accent.red}15`, border: `1px solid ${T.accent.red}30`, borderRadius: T.radius.sm, marginBottom: 14, fontSize: 12, color: T.accent.red }}>{errors.join(' • ')}</div>}

        {/* Asset Category Selector */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{isRTL ? 'סוג נכס' : 'Asset Type'}</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map(cat => (
              <button key={cat} onClick={() => { setAssetCategory(cat); if (ASSET_CATEGORIES[cat].length > 0) setForm(f => ({ ...f, coin: ASSET_CATEGORIES[cat][0] })); }}
                style={{ padding: isMobile ? '8px 14px' : '6px 14px', border: `1px solid ${assetCategory === cat ? categoryColors[cat] : T.border.medium}`, borderRadius: T.radius.sm, background: assetCategory === cat ? `${categoryColors[cat]}15` : T.bg.tertiary, color: assetCategory === cat ? categoryColors[cat] : T.text.muted, cursor: 'pointer', fontSize: isMobile ? 12 : 11, fontWeight: 600, transition: 'all 0.2s' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol Selection */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{isRTL ? 'סימול' : 'Symbol'}</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" placeholder={isRTL ? 'הקלד סימול...' : 'Type any symbol...'} value={customSymbol || form.coin} onChange={e => handleCustomSymbol(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            {form.coin && <span style={{ padding: '4px 10px', background: `${categoryColors[assetCategory]}15`, border: `1px solid ${categoryColors[assetCategory]}30`, borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700, color: categoryColors[assetCategory], fontFamily: "'JetBrains Mono', monospace" }}>{form.coin}</span>}
          </div>
          {ASSET_CATEGORIES[assetCategory].length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
              {ASSET_CATEGORIES[assetCategory].map(s => (
                <button key={s} onClick={() => handleSymbolSelect(s)} style={{ padding: isMobile ? '5px 10px' : '3px 8px', border: `1px solid ${form.coin === s ? categoryColors[assetCategory] : T.border.subtle}`, borderRadius: 4, background: form.coin === s ? `${categoryColors[assetCategory]}12` : 'transparent', color: form.coin === s ? categoryColors[assetCategory] : T.text.muted, cursor: 'pointer', fontSize: isMobile ? 11 : 10, fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s' }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Date + Direction + Order Type */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
            <label style={labelStyle}>{t.date}</label>
            <input type="datetime-local" value={form.date} onChange={e => handleDateChange(e.target.value)} style={inputStyle} />
          </div>
          <div><label style={labelStyle}>{t.direction}</label><div style={{ display: 'flex', gap: 4 }}>
            {(['Long','Short'] as const).map(d => <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))} style={{ flex: 1, padding: isMobile ? '10px' : '8px', border: `1px solid ${form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.border.medium}`, borderRadius: T.radius.sm, background: form.direction === d ? `${d === 'Long' ? T.accent.green : T.accent.red}15` : T.bg.tertiary, color: form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.text.muted, cursor: 'pointer', fontSize: isMobile ? 13 : 12, fontWeight: 600 }}>{d === 'Long' ? '↑ ' + t.long : '↓ ' + t.short}</button>)}
          </div></div>
          <div><label style={labelStyle}>{t.orderType}</label><select value={form.orderType} onChange={e => setForm(f => ({ ...f, orderType: e.target.value }))} style={inputStyle}><option value="Market">Market</option><option value="Limit">Limit</option><option value="Stop">Stop</option></select></div>
        </div>

        {/* Entry */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={labelStyle}>{t.entry}</label><input type="number" step="any" value={form.entry || ''} onChange={e => setForm(f => ({ ...f, entry: +e.target.value }))} style={inputStyle} /></div>

          {/* Stop Loss with mode selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>{t.stopLoss}</label>
              <div style={{ display: 'flex', gap: 2 }}>
                {availableStopModes.map(m => (
                  <button key={m.id} onClick={() => handleStopModeChange(m.id)} style={modeBtnStyle(stopMode === m.id, T.accent.orange)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {stopMode === 'price' ? (
              <input type="number" step="any" value={form.stopLoss || ''} onChange={e => setForm(f => ({ ...f, stopLoss: +e.target.value }))} style={inputStyle} />
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number" step="any"
                  value={stopMode === 'pips' ? (stopPips || '') : stopMode === 'percent' ? (stopPercent || '') : (stopDollar || '')}
                  onChange={e => handleStopValueChange(+e.target.value)}
                  placeholder={stopMode === 'pips' ? (assetCategory === 'Futures' ? 'Ticks' : 'Pips') : stopMode === 'percent' ? '%' : '$'}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {form.stopLoss > 0 && (
                  <div style={{ fontSize: 10, color: T.text.muted, alignSelf: 'center', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                    → {form.stopLoss.toFixed(form.stopLoss < 1 ? 5 : 2)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div><label style={labelStyle}>{t.exit}</label><input type="number" step="any" value={form.exit || ''} onChange={e => setForm(f => ({ ...f, exit: +e.target.value }))} style={inputStyle} /></div>
        </div>

        {/* Risk section with mode toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>{isRTL ? 'סיכון' : 'Risk'}</label>
              <button onClick={handleRiskModeToggle} style={modeBtnStyle(true, T.accent.cyan)}>
                {riskMode === 'dollar' ? '$ → %' : '% → $'}
              </button>
            </div>
            {riskMode === 'dollar' ? (
              <input type="number" step="any" value={form.risk || ''} onChange={e => handleRiskChange(+e.target.value)} placeholder="$ Risk" style={inputStyle} />
            ) : (
              <input type="number" step="0.1" value={form.riskPct || ''} onChange={e => handleRiskChange(+e.target.value)} placeholder="% Risk" style={inputStyle} />
            )}
            <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {riskMode === 'dollar'
                ? `${form.riskPct.toFixed(1)}% of ${currentBalance > 0 ? '$' + currentBalance.toFixed(0) : 'balance'}`
                : `$${form.risk.toFixed(2)}`
              }
            </div>
          </div>
          <div><label style={labelStyle}>{t.leverage}x</label><input type="number" value={form.leverage} onChange={e => setForm(f => ({ ...f, leverage: +e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>{t.positionSize}</label>
            <input type="number" step="any" value={form.positionSize || ''} onChange={e => setForm(f => ({ ...f, positionSize: +e.target.value }))} style={inputStyle} />
            {autoCalcPositionSize > 0 && !form.positionSize && (
              <button onClick={() => setForm(f => ({ ...f, positionSize: +autoCalcPositionSize.toFixed(4) }))} style={{ fontSize: 9, color: T.accent.cyan, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, padding: 0 }}>
                {isRTL ? 'חישוב אוטומטי:' : 'Auto:'} {autoCalcPositionSize.toFixed(4)}
              </button>
            )}
          </div>
          {!isMobile && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: T.text.secondary }}>
              <input type="checkbox" checked={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.checked }))} style={{ accentColor: T.accent.cyan }} />
              {t.rules}
            </label>
          </div>}
        </div>

        {/* Mobile rules checkbox */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: T.text.secondary }}>
              <input type="checkbox" checked={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.checked }))} style={{ accentColor: T.accent.cyan }} />
              {t.rules} {isRTL ? 'נשמרו' : 'Followed'}
            </label>
          </div>
        )}

        {/* Comments */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t.comments}</label>
          <textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} style={{ ...inputStyle, minHeight: isMobile ? 50 : 60, resize: 'vertical' }} />
        </div>

        {/* Live preview */}
        <GlassCard T={T} style={{ marginBottom: 18, padding: isMobile ? 12 : 14 }}>
          <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', marginBottom: 8 }}>{isRTL ? 'תצוגה מקדימה' : 'Preview'}</div>
          <div style={{ display: 'flex', gap: isMobile ? 14 : 20, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 9, color: T.text.muted }}>R</div><div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: returnR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{returnR.toFixed(2)}R</div></div>
            <div><div style={{ fontSize: 9, color: T.text.muted }}>P&L</div><div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</div></div>
            <div><div style={{ fontSize: 9, color: T.text.muted }}>{t.result}</div><div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: winLoss === 'Win' ? T.accent.green : winLoss === 'Loss' ? T.accent.red : T.accent.orange }}>{winLoss}</div></div>
            <div><div style={{ fontSize: 9, color: T.text.muted }}>{t.balance}</div><div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>${(currentBalance + pnl).toFixed(2)}</div></div>
          </div>
        </GlassCard>

        {/* Submit buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: isMobile ? '11px 20px' : '9px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 13 }}>{t.cancel}</button>
          <button onClick={handleSubmit} style={{ padding: isMobile ? '11px 28px' : '9px 24px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 13, flex: isMobile ? 1 : 'none' }}>{t.save}</button>
        </div>
        </div>
      </div>
    </div>
  );
};
