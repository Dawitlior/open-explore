import { useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { GlassCard } from './TradingUI';

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

const detectCategory = (symbol: string): AssetCategory => {
  for (const [cat, symbols] of Object.entries(ASSET_CATEGORIES)) {
    if ((symbols as readonly string[]).includes(symbol)) return cat as AssetCategory;
  }
  return 'Crypto';
};

export const TradeForm = ({ T, t, isRTL, trade, currentBalance, onSave, onClose }: TradeFormProps) => {
  const [assetCategory, setAssetCategory] = useState<AssetCategory>(() => trade?.coin ? detectCategory(trade.coin) : 'Crypto');
  const [customSymbol, setCustomSymbol] = useState('');
  const [form, setForm] = useState({
    date: trade?.date || new Date().toISOString().slice(0, 16),
    day: trade?.day || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()],
    coin: trade?.coin || 'BTC',
    direction: trade?.direction || 'Long' as 'Long' | 'Short',
    orderType: trade?.orderType || 'Market',
    entry: trade?.entry || 0,
    stopLoss: trade?.stopLoss || 0,
    exit: trade?.exit || 0,
    risk: trade?.risk || 2,
    riskPct: trade?.riskPct || 1,
    leverage: trade?.leverage || 10,
    positionSize: trade?.positionSize || 0,
    rules: trade?.rules ?? true,
    comments: trade?.comments || '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleDateChange = (val: string) => {
    const d = new Date(val);
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    setForm(f => ({ ...f, date: val, day }));
  };

  const handleSymbolSelect = (symbol: string) => {
    setForm(f => ({ ...f, coin: symbol }));
    setCustomSymbol('');
  };

  const handleCustomSymbol = (val: string) => {
    setCustomSymbol(val);
    if (val.trim()) setForm(f => ({ ...f, coin: val.trim().toUpperCase() }));
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
      expectedLoss, pnl, deviation, positionSize: form.positionSize, leverage: form.leverage,
      riskPct: form.riskPct, rules: form.rules, comments: form.comments,
    } as Omit<Trade, 'id' | 'balance'>);
  };

  const { returnR, pnl, winLoss } = calc();
  const inputStyle = { width: '100%', padding: '8px 10px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.sm, color: T.text.primary, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' };
  const labelStyle = { fontSize: 9, color: T.text.dim, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, display: 'block' };
  const categoryColors: Record<AssetCategory, string> = { Crypto: T.accent.cyan, Stocks: T.accent.green, Forex: T.accent.purple, Futures: T.accent.orange, Options: T.accent.blue };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl, padding: 28, maxWidth: 620, width: '95%', maxHeight: '90vh', overflow: 'auto', boxShadow: T.shadow.elevated }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{trade ? t.editTrade : t.addTrade}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        
        {errors.length > 0 && <div style={{ padding: 10, background: `${T.accent.red}15`, border: `1px solid ${T.accent.red}30`, borderRadius: T.radius.sm, marginBottom: 14, fontSize: 12, color: T.accent.red }}>{errors.join(' • ')}</div>}

        {/* Asset Category Selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{isRTL ? 'סוג נכס' : 'Asset Type'}</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map(cat => (
              <button key={cat} onClick={() => { setAssetCategory(cat); if (ASSET_CATEGORIES[cat].length > 0) setForm(f => ({ ...f, coin: ASSET_CATEGORIES[cat][0] })); }}
                style={{ padding: '6px 14px', border: `1px solid ${assetCategory === cat ? categoryColors[cat] : T.border.medium}`, borderRadius: T.radius.sm, background: assetCategory === cat ? `${categoryColors[cat]}15` : T.bg.tertiary, color: assetCategory === cat ? categoryColors[cat] : T.text.muted, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s' }}>
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
                <button key={s} onClick={() => handleSymbolSelect(s)} style={{ padding: '3px 8px', border: `1px solid ${form.coin === s ? categoryColors[assetCategory] : T.border.subtle}`, borderRadius: 4, background: form.coin === s ? `${categoryColors[assetCategory]}12` : 'transparent', color: form.coin === s ? categoryColors[assetCategory] : T.text.dim, cursor: 'pointer', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s' }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={labelStyle}>{t.date}</label><input type="datetime-local" value={form.date} onChange={e => handleDateChange(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.direction}</label><div style={{ display: 'flex', gap: 4 }}>
            {(['Long','Short'] as const).map(d => <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))} style={{ flex: 1, padding: '8px', border: `1px solid ${form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.border.medium}`, borderRadius: T.radius.sm, background: form.direction === d ? `${d === 'Long' ? T.accent.green : T.accent.red}15` : T.bg.tertiary, color: form.direction === d ? (d === 'Long' ? T.accent.green : T.accent.red) : T.text.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{d === 'Long' ? '↑ ' + t.long : '↓ ' + t.short}</button>)}
          </div></div>
          <div><label style={labelStyle}>{t.orderType}</label><select value={form.orderType} onChange={e => setForm(f => ({ ...f, orderType: e.target.value }))} style={inputStyle}><option value="Market">Market</option><option value="Limit">Limit</option><option value="Stop">Stop</option></select></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={labelStyle}>{t.entry}</label><input type="number" step="any" value={form.entry || ''} onChange={e => setForm(f => ({ ...f, entry: +e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.stopLoss}</label><input type="number" step="any" value={form.stopLoss || ''} onChange={e => setForm(f => ({ ...f, stopLoss: +e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.exit}</label><input type="number" step="any" value={form.exit || ''} onChange={e => setForm(f => ({ ...f, exit: +e.target.value }))} style={inputStyle} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={labelStyle}>{t.dollarRisk} ($)</label><input type="number" step="any" value={form.risk} onChange={e => setForm(f => ({ ...f, risk: +e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.pctRisk} (%)</label><input type="number" step="0.1" value={form.riskPct} onChange={e => setForm(f => ({ ...f, riskPct: +e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.leverage}x</label><input type="number" value={form.leverage} onChange={e => setForm(f => ({ ...f, leverage: +e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.positionSize}</label><input type="number" step="any" value={form.positionSize} onChange={e => setForm(f => ({ ...f, positionSize: +e.target.value }))} style={inputStyle} /></div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t.comments}</label>
          <textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: T.text.secondary }}>
            <input type="checkbox" checked={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.checked }))} />
            {t.rules} {isRTL ? 'נשמרו' : 'Followed'}
          </label>
        </div>

        {/* Live preview */}
        <GlassCard T={T} style={{ marginBottom: 18, padding: 14 }}>
          <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', marginBottom: 8 }}>{isRTL ? 'תצוגה מקדימה' : 'Preview'}</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div><div style={{ fontSize: 9, color: T.text.dim }}>R</div><div style={{ fontSize: 16, fontWeight: 700, color: returnR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{returnR.toFixed(2)}R</div></div>
            <div><div style={{ fontSize: 9, color: T.text.dim }}>P&L</div><div style={{ fontSize: 16, fontWeight: 700, color: pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</div></div>
            <div><div style={{ fontSize: 9, color: T.text.dim }}>{t.result}</div><div style={{ fontSize: 14, fontWeight: 600, color: winLoss === 'Win' ? T.accent.green : winLoss === 'Loss' ? T.accent.red : T.accent.orange }}>{winLoss}</div></div>
            <div><div style={{ fontSize: 9, color: T.text.dim }}>{t.balance}</div><div style={{ fontSize: 14, fontWeight: 600, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>${(currentBalance + pnl).toFixed(2)}</div></div>
          </div>
        </GlassCard>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 13 }}>{t.cancel}</button>
          <button onClick={handleSubmit} style={{ padding: '9px 24px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{t.save}</button>
        </div>
      </div>
    </div>
  );
};
