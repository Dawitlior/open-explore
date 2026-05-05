import { useState, useRef } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { ThemeId, OperatingMode } from '@/hooks/use-settings';
import { useDashboardConfig, WIDGET_LABELS, evalCustomKPI, type CustomKPI, type WidgetId } from '@/hooks/use-dashboard-config';
import type { TradingStats } from '@/lib/trading-analytics';
import { useRiskLimits } from '@/hooks/use-risk-limits';
import { DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';
import { useUIPrefs } from '@/hooks/use-ui-prefs';

interface SettingsHubProps {
  T: TradingTheme;
  isRTL: boolean;
  open: boolean;
  onClose: () => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  stats: TradingStats;
}

type TabId = 'theme' | 'dashboard' | 'kpis' | 'risk';

const THEME_OPTIONS: { id: ThemeId; label: { he: string; en: string }; icon: string; preview: string[] }[] = [
  { id: 'midnight', label: { he: 'חצות', en: 'Midnight' }, icon: '🌙', preview: ['#020202', '#00f2ff', '#3b82f6'] },
  { id: 'indigo', label: { he: 'אינדיגו ליל', en: 'Indigo Noir' }, icon: '🌌', preview: ['#06030f', '#a78bfa', '#6366f1'] },
  { id: 'platinum', label: { he: 'לבן יוקרתי', en: 'Platinum White' }, icon: '🤍', preview: ['#ffffff', '#1d4ed8', '#b45309'] },
];

const TOKEN_LIST = [
  'totalTrades', 'wins', 'losses', 'winRate', 'totalPnl',
  'avgWin', 'avgLoss', 'expectancy', 'profitFactor', 'maxDrawdown', 'totalR',
];

export function SettingsHub({ T, isRTL, open, onClose, theme, setTheme, stats }: SettingsHubProps) {
  const [tab, setTab] = useState<TabId>('theme');
  const dash = useDashboardConfig();
  const riskCfg = useRiskLimits();
  const [pendingLimits, setPendingLimits] = useState<{ trade: string; day: string; week: string; month: string } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [newKpi, setNewKpi] = useState<Partial<CustomKPI>>({ label: '', formula: '', format: 'number' });
  const dialogRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const t = (he: string, en: string) => isRTL ? he : en;

  const totalTrades = stats.totalTrades || 0;
  const winRate = stats.winRate || 0;
  const wins = Math.round((winRate / 100) * totalTrades);
  const losses = Math.max(0, totalTrades - wins);
  const ctx: Record<string, number> = {
    totalTrades,
    wins,
    losses,
    breakEven: 0,
    winRate,
    totalPnl: stats.totalPnl || 0,
    avgWin: stats.avgWin || 0,
    avgLoss: stats.avgLoss || 0,
    expectancy: stats.expectancyDollar || 0,
    profitFactor: stats.profitFactor || 0,
    maxDrawdown: stats.maxDrawdown || 0,
    totalR: (stats.expectancyR || 0) * totalTrades,
    avgR: stats.expectancyR || 0,
    bestTrade: stats.bestTrade || 0,
    worstTrade: stats.worstTrade || 0,
  };

  const addKpi = () => {
    if (!newKpi.label || !newKpi.formula) return;
    const result = evalCustomKPI(newKpi.formula, ctx);
    if (result === null) {
      alert(t('נוסחה לא תקינה. השתמש בטוקנים: ' + TOKEN_LIST.join(', '), 'Invalid formula. Use tokens: ' + TOKEN_LIST.join(', ')));
      return;
    }
    const kpi: CustomKPI = {
      id: `kpi_${Date.now()}`,
      label: newKpi.label,
      formula: newKpi.formula,
      format: newKpi.format || 'number',
    };
    dash.setKpis([...dash.kpis, kpi]);
    setNewKpi({ label: '', formula: '', format: 'number' });
  };

  const removeKpi = (id: string) => {
    dash.setKpis(dash.kpis.filter(k => k.id !== id));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) dash.moveWidget(dragIdx, idx);
    setDragIdx(null);
    setOverIdx(null);
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    direction: isRTL ? 'rtl' : 'ltr',
    animation: 'fadeIn .2s ease-out',
  };
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 820, maxHeight: '90vh', overflow: 'hidden',
    background: T.bg.secondary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
    display: 'flex', flexDirection: 'column', boxShadow: T.shadow.elevated,
    fontFamily: "'Poppins',sans-serif",
  };
  const header: React.CSSProperties = {
    padding: '18px 24px', borderBottom: `1px solid ${T.border.subtle}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: `linear-gradient(135deg, ${T.accent.cyanGlow}, transparent)`,
  };
  const tabBar: React.CSSProperties = {
    display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: `1px solid ${T.border.subtle}`,
  };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: `${T.radius.sm}px ${T.radius.sm}px 0 0`,
    background: active ? T.bg.tertiary : 'transparent',
    color: active ? T.accent.cyan : T.text.muted,
    border: 'none', borderBottom: active ? `2px solid ${T.accent.cyan}` : '2px solid transparent',
    cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
    fontFamily: "'Poppins',sans-serif", transition: 'all .15s',
  });
  const body: React.CSSProperties = { padding: 24, overflowY: 'auto', flex: 1 };

  return (
    <div style={overlay} onClick={onClose}>
      <div ref={dialogRef} style={card} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text.primary, letterSpacing: '0.5px' }}>
              {t('הגדרות', 'Settings')}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: `1px solid ${T.border.medium}`, color: T.text.muted,
              width: 30, height: 30, borderRadius: T.radius.sm, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        <div style={tabBar}>
          <button style={tabBtn(tab === 'theme')} onClick={() => setTab('theme')}>🎨 {t('ערכת נושא', 'Theme')}</button>
          <button style={tabBtn(tab === 'dashboard')} onClick={() => setTab('dashboard')}>📊 {t('דאשבורד', 'Dashboard')}</button>
          <button style={tabBtn(tab === 'kpis')} onClick={() => setTab('kpis')}>🧮 {t('KPI מותאמים', 'Custom KPIs')}</button>
          <button style={tabBtn(tab === 'risk')} onClick={() => setTab('risk')}>🛡️ {t('סיכון', 'Risk Limits')}</button>
        </div>

        <div style={body}>
          {tab === 'theme' && (
            <div>
              <p style={{ color: T.text.muted, fontSize: 12, marginBottom: 16 }}>
                {t('בחר את הערכה הויזואלית של האפליקציה. השינוי מיידי וגלובלי.', 'Pick the visual scheme. Changes apply instantly across the app.')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {THEME_OPTIONS.map(opt => {
                  const active = theme === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setTheme(opt.id)}
                      style={{
                        padding: 16, borderRadius: T.radius.md, cursor: 'pointer', textAlign: 'start',
                        background: active ? T.bg.tertiary : T.bg.primary,
                        border: `2px solid ${active ? T.accent.cyan : T.border.subtle}`,
                        boxShadow: active ? T.shadow.glow(T.accent.cyanGlow) : 'none',
                        transition: 'all .2s', fontFamily: "'Poppins',sans-serif",
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: T.text.primary }}>
                          {opt.icon} {opt.label[isRTL ? 'he' : 'en']}
                        </span>
                        {active && <span style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 800 }}>✓ {t('פעיל', 'ACTIVE')}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {opt.preview.map((c, i) => (
                          <div key={i} style={{ flex: 1, height: 28, borderRadius: 6, background: c, border: `1px solid ${T.border.subtle}` }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ color: T.text.muted, fontSize: 12, margin: 0 }}>
                  {t('גרור לסידור מחדש. לחץ על העין להסתרה.', 'Drag to reorder. Click the eye to hide.')}
                </p>
                <button onClick={dash.resetLayout}
                  style={{ background: 'transparent', border: `1px solid ${T.border.medium}`, color: T.text.muted,
                    padding: '6px 12px', borderRadius: T.radius.sm, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  ↺ {t('איפוס', 'Reset')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dash.layout.map((w, idx) => {
                  const isDrag = dragIdx === idx;
                  const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
                  return (
                    <div key={w.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      onDrop={() => handleDrop(idx)}
                      style={{
                        padding: '12px 14px', borderRadius: T.radius.md, cursor: 'grab',
                        background: isOver ? T.accent.cyanGlow : T.bg.primary,
                        border: `1px solid ${isOver ? T.accent.cyan : T.border.subtle}`,
                        opacity: isDrag ? 0.4 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all .15s', userSelect: 'none',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: T.text.muted, fontSize: 14 }}>⋮⋮</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: w.visible ? T.text.primary : T.text.muted }}>
                          {WIDGET_LABELS[w.id]?.[isRTL ? 'he' : 'en'] || w.id}
                        </span>
                      </div>
                      <button onClick={() => dash.toggleWidget(w.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                          color: w.visible ? T.accent.cyan : T.text.muted, fontSize: 16 }}>
                        {w.visible ? '👁️' : '🚫'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'kpis' && (
            <div>
              <p style={{ color: T.text.muted, fontSize: 12, marginBottom: 14 }}>
                {t('צור מדדים מותאמים אישית באמצעות נוסחאות מתמטיות.', 'Create custom metrics with mathematical formulas.')}
              </p>

              {dash.kpis.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {dash.kpis.map(k => {
                    const val = evalCustomKPI(k.formula, ctx);
                    return (
                      <div key={k.id} style={{
                        padding: '12px 14px', borderRadius: T.radius.md,
                        background: T.bg.primary, border: `1px solid ${T.border.subtle}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>{k.label}</div>
                          <div style={{ fontSize: 10, color: T.text.muted, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
                            = {k.formula}
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: val !== null ? T.accent.cyan : T.accent.red, fontFamily: "'IBM Plex Mono',monospace" }}>
                          {val !== null
                            ? (k.format === 'currency' ? `$${val.toFixed(2)}`
                              : k.format === 'percent' ? `${val.toFixed(1)}%`
                              : k.format === 'r-multiple' ? `${val.toFixed(2)}R`
                              : val.toFixed(2))
                            : 'ERR'}
                        </div>
                        <button onClick={() => removeKpi(k.id)}
                          style={{ background: 'transparent', border: `1px solid ${T.border.medium}`,
                            color: T.accent.red, width: 28, height: 28, borderRadius: T.radius.sm, cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ padding: 14, borderRadius: T.radius.md, background: T.bg.primary, border: `1px solid ${T.border.subtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.muted, marginBottom: 10, letterSpacing: '0.5px' }}>
                  ➕ {t('הוסף KPI חדש', 'NEW KPI')}
                </div>
                <input
                  value={newKpi.label || ''}
                  onChange={e => setNewKpi(p => ({ ...p, label: e.target.value }))}
                  placeholder={t('שם (למשל: Risk-Adjusted Return)', 'Label (e.g., Risk-Adjusted Return)')}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: 8, borderRadius: T.radius.sm,
                    background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, color: T.text.primary,
                    fontSize: 12, outline: 'none', fontFamily: "'Poppins',sans-serif", boxSizing: 'border-box' }}
                />
                <input
                  value={newKpi.formula || ''}
                  onChange={e => setNewKpi(p => ({ ...p, formula: e.target.value }))}
                  placeholder={t('נוסחה (למשל: totalPnl / Math.abs(maxDrawdown))', 'Formula (e.g., totalPnl / Math.abs(maxDrawdown))')}
                  style={{ width: '100%', padding: '8px 10px', marginBottom: 8, borderRadius: T.radius.sm,
                    background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, color: T.text.primary,
                    fontSize: 12, outline: 'none', fontFamily: "'IBM Plex Mono',monospace", boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={newKpi.format || 'number'}
                    onChange={e => setNewKpi(p => ({ ...p, format: e.target.value as CustomKPI['format'] }))}
                    style={{ padding: '8px 10px', borderRadius: T.radius.sm,
                      background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, color: T.text.primary,
                      fontSize: 12, outline: 'none', fontFamily: "'Poppins',sans-serif" }}>
                    <option value="number">{t('מספר', 'Number')}</option>
                    <option value="currency">{t('מטבע ($)', 'Currency ($)')}</option>
                    <option value="percent">{t('אחוז (%)', 'Percent (%)')}</option>
                    <option value="r-multiple">R-Multiple</option>
                  </select>
                  <button onClick={addKpi}
                    style={{ flex: 1, padding: '8px 14px', borderRadius: T.radius.sm,
                      background: T.accent.cyan, border: 'none', color: T.bg.primary,
                      cursor: 'pointer', fontSize: 12, fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>
                    {t('הוסף', 'Add')}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 10, lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace" }}>
                  <strong style={{ color: T.text.secondary }}>{t('טוקנים:', 'Tokens:')}</strong> {TOKEN_LIST.join(', ')}
                </div>
              </div>
            </div>
          )}

          {tab === 'risk' && (() => {
            const cur = pendingLimits || {
              trade: String(Math.abs(riskCfg.limits.trade)),
              day: String(Math.abs(riskCfg.limits.day)),
              week: String(Math.abs(riskCfg.limits.week)),
              month: String(Math.abs(riskCfg.limits.month)),
            };
            const dirty = pendingLimits !== null && (
              parseFloat(cur.trade) !== Math.abs(riskCfg.limits.trade) ||
              parseFloat(cur.day) !== Math.abs(riskCfg.limits.day) ||
              parseFloat(cur.week) !== Math.abs(riskCfg.limits.week) ||
              parseFloat(cur.month) !== Math.abs(riskCfg.limits.month)
            );
            const update = (k: 'trade' | 'day' | 'week' | 'month') => (e: React.ChangeEvent<HTMLInputElement>) => {
              setPendingLimits(p => ({ ...(p || cur), [k]: e.target.value }));
            };
            const apply = () => {
              const trade = parseFloat(cur.trade); const day = parseFloat(cur.day);
              const week = parseFloat(cur.week); const month = parseFloat(cur.month);
              if (![trade, day, week, month].every(n => isFinite(n) && n > 0)) {
                alert(t('כל הערכים חייבים להיות מספרים חיוביים', 'All values must be positive numbers'));
                return;
              }
              riskCfg.setLimits({ trade: -trade, day: -day, week: -week, month: -month });
              setPendingLimits(null);
            };
            const fieldStyle: React.CSSProperties = {
              width: '100%', padding: '10px 12px', borderRadius: T.radius.sm,
              background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, color: T.text.primary,
              fontSize: 14, outline: 'none', fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, boxSizing: 'border-box', textAlign: 'center',
            };
            const labelStyle: React.CSSProperties = {
              fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700,
            };
            const cellStyle: React.CSSProperties = {
              padding: 14, borderRadius: T.radius.md, background: T.bg.primary,
              border: `1px solid ${T.border.subtle}`,
            };
            return (
              <div>
                <p style={{ color: T.text.muted, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                  {t(
                    '🛡️ הגדר את מגבלות ההפסד שלך ב־R שלילי. כשמגיעים למגבלה, האפליקציה מתריעה ומומלץ להפסיק לסחור.',
                    '🛡️ Set your loss limits in negative R. When breached, the app alerts and recommends to stop trading.'
                  )}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div style={cellStyle}>
                    <div style={labelStyle}>{t('סיכון לעסקה', 'Per-Trade Risk')}</div>
                    <input type="number" step="0.1" min="0.1" value={cur.trade} onChange={update('trade')} style={fieldStyle} />
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 6, textAlign: 'center' }}>
                      −{cur.trade}R {t('לעסקה אחת', 'per single trade')}
                    </div>
                  </div>
                  <div style={cellStyle}>
                    <div style={labelStyle}>{t('הפסד יומי מקסימלי', 'Daily Max Loss')}</div>
                    <input type="number" step="0.1" min="0.1" value={cur.day} onChange={update('day')} style={fieldStyle} />
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 6, textAlign: 'center' }}>
                      −{cur.day}R {t('ביום מסחר', 'per trading day')}
                    </div>
                  </div>
                  <div style={cellStyle}>
                    <div style={labelStyle}>{t('הפסד שבועי מקסימלי', 'Weekly Max Loss')}</div>
                    <input type="number" step="0.5" min="0.5" value={cur.week} onChange={update('week')} style={fieldStyle} />
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 6, textAlign: 'center' }}>
                      −{cur.week}R {t('בשבוע מסחר', 'per trading week')}
                    </div>
                  </div>
                  <div style={cellStyle}>
                    <div style={labelStyle}>{t('הפסד חודשי מקסימלי', 'Monthly Max Loss')}</div>
                    <input type="number" step="0.5" min="0.5" value={cur.month} onChange={update('month')} style={fieldStyle} />
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 6, textAlign: 'center' }}>
                      −{cur.month}R {t('בחודש מסחר', 'per trading month')}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: 12, borderRadius: T.radius.md,
                  background: `linear-gradient(135deg, ${T.accent.orange}10, transparent)`,
                  border: `1px solid ${T.accent.orange}25`, marginBottom: 14, fontSize: 11,
                  color: T.text.secondary, lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, color: T.accent.orange, marginBottom: 4, fontSize: 11, letterSpacing: '0.05em' }}>
                    💡 {t('המלצה', 'GUIDELINE')}
                  </div>
                  {t(
                    'יום ≤ 2× סיכון לעסקה  ·  שבוע ≤ 5× סיכון לעסקה  ·  חודש ≤ 10× סיכון לעסקה',
                    'Day ≤ 2× per-trade  ·  Week ≤ 5× per-trade  ·  Month ≤ 10× per-trade'
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={apply} disabled={!dirty} style={{
                    flex: 1, padding: '10px 14px', borderRadius: T.radius.sm,
                    background: dirty ? T.accent.cyan : T.bg.tertiary, border: 'none',
                    color: dirty ? T.bg.primary : T.text.muted, cursor: dirty ? 'pointer' : 'default',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {dirty ? t('שמור מגבלות', 'Save Limits') : t('נשמר ✓', 'Saved ✓')}
                  </button>
                  <button onClick={() => { riskCfg.reset(); setPendingLimits(null); }} style={{
                    padding: '10px 14px', borderRadius: T.radius.sm,
                    background: 'transparent', border: `1px solid ${T.border.medium}`,
                    color: T.text.muted, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>
                    ↺ {t('ברירת מחדל', 'Reset Default')}
                  </button>
                </div>
                <div style={{ fontSize: 9, color: T.text.dim, marginTop: 10, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                  {t('ברירת מחדל:', 'Default:')} −{Math.abs(DEFAULT_RISK_LIMITS.trade)}R / −{Math.abs(DEFAULT_RISK_LIMITS.day)}R / −{Math.abs(DEFAULT_RISK_LIMITS.week)}R / −{Math.abs(DEFAULT_RISK_LIMITS.month)}R
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
