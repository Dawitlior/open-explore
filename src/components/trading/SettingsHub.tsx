import { useState, useRef, useMemo, useEffect } from 'react';
import {
  User, Palette, LayoutDashboard, Calculator, Shield, SlidersHorizontal, Database,
  X, LogOut, Mail, KeyRound, Send, Download, Eye, EyeOff, Globe, GripVertical,
  Plus, Trash2, RotateCcw, Check, AlertTriangle, Sparkles, Search,
  Volume2, VolumeX, Zap, Type, Brush, Target, Gauge, Plug,
} from 'lucide-react';
import { ExchangesPanel } from './ExchangesPanel';
import { playMorningLock } from '@/lib/apex-sounds';
import type { TradingTheme, CustomTheme, BaseMood } from '@/lib/trading-theme';
import { deriveFullPalette, deriveFromCustomTheme, CUSTOM_THEME_DEFAULT } from '@/lib/trading-theme';
import type { ThemeId, OperatingMode, Lang } from '@/hooks/use-settings';
import { useDashboardConfig, WIDGET_LABELS, evalCustomKPI, type CustomKPI } from '@/hooks/use-dashboard-config';
import type { TradingStats } from '@/lib/trading-analytics';
import { useRiskLimits } from '@/hooks/use-risk-limits';
import { DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';
import { useUIPrefs } from '@/hooks/use-ui-prefs';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Trade } from '@/data/trades';
import { AvatarUploader } from './AvatarUploader';
import { InstallGuide } from './InstallGuide';
import { ResetModal } from './ResetModal';
import { scopedStorage } from '@/lib/scoped-storage';
import { i18n as i18nStrings } from '@/lib/trading-i18n';

interface SettingsHubProps {
  T: TradingTheme;
  isRTL: boolean;
  open: boolean;
  onClose: () => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  stats: TradingStats;
  lang: Lang;
  setLang: (l: Lang) => void;
  privacyMode: boolean;
  setPrivacyMode: (p: boolean) => void;
  trades: Trade[];
}

type TabId = 'account' | 'appearance' | 'theme-studio' | 'dashboard' | 'kpis' | 'risk' | 'interface' | 'sounds' | 'trading' | 'exchanges' | 'data' | 'install';

const ACCENT_PRESETS = [
  '#00f2ff', '#06d6a0', '#3b82f6', '#8b5cf6',
  '#a78bfa', '#f43f5e', '#f59e0b', '#10b981',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
];

const THEME_OPTIONS: { id: ThemeId; label: { he: string; en: string }; sub: { he: string; en: string }; preview: string[] }[] = [
  { id: 'midnight', label: { he: 'חצות', en: 'Midnight' }, sub: { he: 'כחול עמוק • ברירת מחדל', en: 'Deep blue • Default' }, preview: ['#020202', '#0b1730', '#00f2ff', '#3b82f6'] },
  { id: 'indigo', label: { he: 'אינדיגו ליל', en: 'Indigo Noir' }, sub: { he: 'סגול-ליל יוקרתי', en: 'Premium night purple' }, preview: ['#06030f', '#1a1338', '#a78bfa', '#6366f1'] },
  { id: 'platinum', label: { he: 'לבן יוקרתי', en: 'Platinum White' }, sub: { he: 'מצב יום מינימלי', en: 'Minimal light mode' }, preview: ['#ffffff', '#f1f5f9', '#1d4ed8', '#b45309'] },
];

const TOKEN_LIST = [
  'totalTrades', 'wins', 'losses', 'winRate', 'totalPnl',
  'avgWin', 'avgLoss', 'expectancy', 'profitFactor', 'maxDrawdown', 'totalR',
];

export function SettingsHub({ T, isRTL, open, onClose, theme, setTheme, stats, lang, setLang, privacyMode, setPrivacyMode, trades }: SettingsHubProps) {
  const [tab, setTab] = useState<TabId>('account');
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const dash = useDashboardConfig();
  const ui = useUIPrefs();
  const riskCfg = useRiskLimits();
  const auth = useAuth();
  const [pendingLimits, setPendingLimits] = useState<{ trade: string; day: string; week: string; month: string } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [newKpi, setNewKpi] = useState<Partial<CustomKPI>>({ label: '', formula: '', format: 'number' });
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draftAccent, setDraftAccent] = useState<string>('#00f2ff');
  const [showThemeConfirm, setShowThemeConfirm] = useState(false);
  const [draftTheme, setDraftTheme] = useState<CustomTheme>(CUSTOM_THEME_DEFAULT);
  const [showStudioConfirm, setShowStudioConfirm] = useState(false);
  const [unlockStep, setUnlockStep] = useState<0 | 1 | 2>(0);
  const [showWipeModal, setShowWipeModal] = useState(false);
  useEffect(() => { if (ui.prefs.customAccent) setDraftAccent(ui.prefs.customAccent); }, [ui.prefs.customAccent]);
  useEffect(() => { if (ui.prefs.customTheme) setDraftTheme(ui.prefs.customTheme); }, [ui.prefs.customTheme]);

  if (!open) return null;
  const t = (he: string, en: string) => isRTL ? he : en;
  const mono = "'IBM Plex Mono', 'JetBrains Mono', monospace";
  const sans = "'Poppins', sans-serif";

  const totalTrades = stats.totalTrades || 0;
  const winRate = stats.winRate || 0;
  const wins = Math.round((winRate / 100) * totalTrades);
  const losses = Math.max(0, totalTrades - wins);
  const ctx: Record<string, number> = {
    totalTrades, wins, losses, breakEven: 0, winRate,
    totalPnl: stats.totalPnl || 0, avgWin: stats.avgWin || 0, avgLoss: stats.avgLoss || 0,
    expectancy: stats.expectancyDollar || 0, profitFactor: stats.profitFactor || 0,
    maxDrawdown: stats.maxDrawdown || 0, totalR: (stats.expectancyR || 0) * totalTrades,
    avgR: stats.expectancyR || 0, bestTrade: stats.bestTrade || 0, worstTrade: stats.worstTrade || 0,
  };

  const NAV: { id: TabId; icon: typeof User; label: { he: string; en: string }; group: { he: string; en: string }; desc: { he: string; en: string } }[] = [
    { id: 'account', icon: User, label: { he: 'חשבון ופרופיל', en: 'Account & Profile' }, group: { he: 'אישי', en: 'Personal' }, desc: { he: 'ניהול פרטי החשבון, סיסמה ואימייל', en: 'Manage account details, password and email' } },
    { id: 'appearance', icon: Palette, label: { he: 'מראה ושפה', en: 'Appearance' }, group: { he: 'אישי', en: 'Personal' }, desc: { he: 'ערכת נושא, שפה ופרטיות', en: 'Theme, language and privacy' } },
    { id: 'theme-studio', icon: Brush, label: { he: 'אולפן צבע', en: 'Theme Studio' }, group: { he: 'אישי', en: 'Personal' }, desc: { he: 'בחר צבע מבטא משלך והתאם את כל אורקה אליו', en: 'Pick your own accent and re-tint all of Orca live' } },
    { id: 'dashboard', icon: LayoutDashboard, label: { he: 'סידור דאשבורד', en: 'Dashboard Layout' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'גרור, הסתר וסדר ווידג׳טים', en: 'Drag, hide and arrange widgets' } },
    { id: 'kpis', icon: Calculator, label: { he: 'מדדים מותאמים', en: 'Custom KPIs' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'בנה נוסחאות מתמטיות משלך', en: 'Build your own math formulas' } },
    { id: 'interface', icon: SlidersHorizontal, label: { he: 'ממשק, צפיפות ותנועה', en: 'Interface, Density & Motion' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'מצבי תפעול, צפיפות, גודל גופן ואנימציות', en: 'Operating modes, density, font scale, motion' } },
    { id: 'sounds', icon: Volume2, label: { he: 'צלילים והתראות', en: 'Sounds & Alerts' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'הפעלה, ווליום ותצוגת אפקטים אקוסטיים', en: 'Enable, volume and acoustic feedback preview' } },
    { id: 'risk', icon: Shield, label: { he: 'מגבלות סיכון', en: 'Risk Limits' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'מערכת ה־R המותרת ביום/שבוע/חודש', en: 'Allowed R-budget per day/week/month' } },
    { id: 'trading', icon: Target, label: { he: 'ברירות מחדל למסחר', en: 'Trading Defaults' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'אחוז סיכון ברירת מחדל ויעד R לעסקה חדשה', en: 'Default risk percent and R target for new trades' } },
    { id: 'exchanges', icon: Plug, label: { he: 'בורסות מחוברות', en: 'Connected Exchanges' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'חבר Bybit, Binance ו־IBKR לכספת מאובטחת', en: 'Connect Bybit, Binance and IBKR to the secure vault' } },
    { id: 'data', icon: Database, label: { he: 'נתונים וגיבוי', en: 'Data & Backup' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'יצוא, סטטיסטיקות וניהול אחסון', en: 'Export, stats and storage management' } },
    { id: 'install', icon: Download, label: { he: 'הורד אפליקציה', en: 'Download App' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'התקן את אורקה על הטלפון או המחשב', en: 'Install Orca on your phone or desktop' } },
  ];

  const filteredNav = useMemo(() => {
    if (!search.trim()) return NAV;
    const q = search.toLowerCase();
    return NAV.filter(n =>
      n.label[isRTL ? 'he' : 'en'].toLowerCase().includes(q) ||
      n.desc[isRTL ? 'he' : 'en'].toLowerCase().includes(q)
    );
  }, [search, isRTL]);

  const groups = Array.from(new Set(filteredNav.map(n => n.group[isRTL ? 'he' : 'en'])));
  const activeMeta = NAV.find(n => n.id === tab)!;

  // Shared style helpers
  const card: React.CSSProperties = {
    background: T.bg.primary, border: `1px solid ${T.border.subtle}`,
    borderRadius: T.radius.lg, padding: 20, marginBottom: 16,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: T.text.primary, margin: '0 0 4px',
    display: 'flex', alignItems: 'center', gap: 8,
  };
  const sectionHint: React.CSSProperties = {
    fontSize: 11.5, color: T.text.muted, margin: '0 0 14px', lineHeight: 1.55,
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: T.text.muted, textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 6, display: 'block',
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: T.radius.sm,
    background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
    color: T.text.primary, fontSize: 13, outline: 'none',
    fontFamily: mono, boxSizing: 'border-box', transition: 'border-color .15s, background .15s',
  };
  const primaryBtn = (color = T.accent.cyan, disabled = false): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: T.radius.sm, border: 'none',
    background: disabled ? T.bg.tertiary : color, color: disabled ? T.text.muted : T.bg.primary,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 800,
    letterSpacing: 0.5, fontFamily: sans, display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'transform .12s, opacity .15s', opacity: disabled ? 0.6 : 1,
  });
  const ghostBtn: React.CSSProperties = {
    padding: '10px 14px', borderRadius: T.radius.sm,
    background: 'transparent', border: `1px solid ${T.border.medium}`,
    color: T.text.secondary, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
    fontFamily: sans, display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  return (
    <div
      className="orca-settings-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2,6,15,0.78)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, direction: isRTL ? 'rtl' : 'ltr',
        animation: 'orcaSettingsFade .22s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes orcaSettingsFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orcaSettingsRise { from { opacity: 0; transform: translateY(12px) scale(.99) } to { opacity: 1; transform: none } }
        .orca-settings-input:focus { border-color: ${T.accent.cyan} !important; background: ${T.bg.secondary} !important; }
        .orca-nav-item:hover { background: ${T.bg.tertiary} !important; }
        .orca-cta:hover:not(:disabled) { transform: translateY(-1px); }
        @media (max-width: 768px) {
          .orca-settings-overlay { padding: 0 !important; }
          .orca-settings-shell { width: 100vw !important; max-width: 100vw !important; height: 100dvh !important; max-height: 100dvh !important; border-radius: 0 !important; grid-template-columns: 1fr !important; grid-template-rows: auto 1fr !important; }
          .orca-settings-sidebar { border-inline-end: 0 !important; border-bottom: 1px solid ${T.border.subtle} !important; max-height: 38dvh !important; }
          .orca-settings-sidebar nav { padding: 4px 8px 10px !important; }
          .orca-settings-content { min-width: 0 !important; }
          .orca-settings-topbar { padding: 12px 14px !important; flex-wrap: wrap !important; gap: 8px !important; }
          .orca-settings-topbar > div:first-child div:first-child { font-size: 15px !important; }
          .orca-settings-topbar > div:first-child div:nth-child(2) { font-size: 11px !important; }
          .orca-settings-body { padding: 14px 14px calc(28px + env(safe-area-inset-bottom)) !important; }
          .orca-settings-body > div > div { padding: 14px !important; }
          .orca-settings-body [style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div
        ref={dialogRef}
        data-settings-hub
        className="orca-settings-shell"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1180, height: '92vh', maxHeight: 880,
          background: T.bg.secondary, border: `1px solid ${T.border.medium}`,
          borderRadius: T.radius.xl, boxShadow: T.shadow.elevated,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
          gridTemplateRows: isMobile ? 'auto 1fr' : '1fr',
          overflow: 'hidden',
          fontFamily: sans, animation: 'orcaSettingsRise .25s ease-out',
        }}
      >
        {/* SIDEBAR */}
        <aside className="orca-settings-sidebar" style={{
          background: T.bg.primary,
          borderInlineEnd: isMobile ? 'none' : `1px solid ${T.border.subtle}`,
          borderBottom: isMobile ? `1px solid ${T.border.subtle}` : 'none',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflow: 'hidden',
          maxHeight: isMobile ? 140 : 'none',
        }}>
          {!isMobile && (
            <div style={{ padding: '20px 18px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: T.text.muted, textTransform: 'uppercase', marginBottom: 4 }}>
                ORCA OS
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.01em' }}>
                {t('הגדרות', 'Settings')}
              </div>
            </div>
          )}

          {!isMobile && (
            <div style={{ padding: '0 14px 12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', top: '50%', insetInlineStart: 11, transform: 'translateY(-50%)', color: T.text.muted, pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('חיפוש בהגדרות', 'Search settings')}
                  style={{
                    width: '100%', padding: `8px 12px 8px ${isRTL ? '12px' : '32px'}`, paddingInlineStart: 32,
                    borderRadius: T.radius.sm, background: T.bg.tertiary,
                    border: `1px solid ${T.border.subtle}`, color: T.text.primary,
                    fontSize: 12, outline: 'none', fontFamily: sans, boxSizing: 'border-box',
                  }}
                  className="orca-settings-input"
                />
              </div>
            </div>
          )}

          <nav style={{
            flex: 1,
            overflowY: isMobile ? 'hidden' : 'auto',
            overflowX: isMobile ? 'auto' : 'hidden',
            padding: isMobile ? '10px 10px' : '4px 10px 16px',
            display: isMobile ? 'flex' : 'block',
            gap: isMobile ? 6 : 0,
            WebkitOverflowScrolling: 'touch',
          }}>
            {isMobile ? (
              filteredNav.map(item => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: T.radius.sm,
                      background: active ? `${T.accent.cyan}18` : T.bg.tertiary,
                      border: `1px solid ${active ? T.accent.cyan : T.border.subtle}`,
                      color: active ? T.accent.cyan : T.text.secondary,
                      fontFamily: sans, fontSize: 12, fontWeight: active ? 700 : 500,
                      whiteSpace: 'nowrap', cursor: 'pointer', flex: '0 0 auto',
                    }}
                  >
                    <Icon size={13} strokeWidth={2.2} />
                    {item.label[isRTL ? 'he' : 'en']}
                  </button>
                );
              })
            ) : groups.map(group => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: 1.8, color: T.text.dim,
                  textTransform: 'uppercase', padding: '6px 10px 8px',
                }}>{group}</div>
                {filteredNav.filter(n => n.group[isRTL ? 'he' : 'en'] === group).map(item => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      className="orca-nav-item"
                      onClick={() => setTab(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                        padding: '9px 11px', marginBottom: 2, borderRadius: T.radius.sm,
                        background: active ? `${T.accent.cyan}14` : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' as const,
                        color: active ? T.accent.cyan : T.text.secondary, fontFamily: sans,
                        fontSize: 12.5, fontWeight: active ? 700 : 500,
                        position: 'relative', transition: 'background .12s, color .12s',
                      }}
                    >
                      {active && <span style={{
                        position: 'absolute', insetInlineStart: 0, top: 6, bottom: 6, width: 3,
                        borderRadius: 3, background: T.accent.cyan,
                      }} />}
                      <Icon size={15} strokeWidth={2.2} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label[isRTL ? 'he' : 'en']}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {filteredNav.length === 0 && (
              <div style={{ padding: 16, fontSize: 11, color: T.text.muted, textAlign: 'center' }}>
                {t('לא נמצאו תוצאות', 'No matches')}
              </div>
            )}
          </nav>

          {!isMobile && (
            <div style={{
              padding: '12px 14px', borderTop: `1px solid ${T.border.subtle}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.purple})`,
                display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800,
                color: T.bg.primary, flexShrink: 0,
              }}>{(auth.user?.email || '?').charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">
                  {auth.user?.email ?? '—'}
                </div>
                <div style={{ fontSize: 9.5, color: T.text.muted, fontFamily: mono }}>
                  {t('מחובר/ת', 'Signed in')}
                </div>
              </div>
              <button
                onClick={async () => { await auth.signOut(); window.location.href = '/auth'; }}
                title={t('התנתק', 'Sign out')}
                style={{
                  width: 30, height: 30, borderRadius: T.radius.sm,
                  background: 'transparent', border: `1px solid ${T.border.medium}`,
                  color: T.accent.orange, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              ><LogOut size={14} /></button>
            </div>
          )}
        </aside>

        {/* CONTENT */}
        <section className="orca-settings-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg.secondary }}>
          {/* Topbar */}
          <header className="orca-settings-topbar" style={{
            padding: '18px 26px', borderBottom: `1px solid ${T.border.subtle}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `linear-gradient(180deg, ${T.bg.primary}, ${T.bg.secondary})`,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.01em' }}>
                {activeMeta.label[isRTL ? 'he' : 'en']}
              </div>
              <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>
                {activeMeta.desc[isRTL ? 'he' : 'en']}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                title={lang === 'he' ? 'Switch to English' : 'החלף לעברית'}
                style={{ ...ghostBtn, padding: '8px 12px' }}
              >
                <Globe size={13} /> {lang === 'he' ? 'EN' : 'HE'}
              </button>
              <button
                onClick={() => setPrivacyMode(!privacyMode)}
                title={privacyMode ? t('כיבוי פרטיות', 'Disable privacy') : t('הפעלת פרטיות', 'Enable privacy')}
                style={{
                  ...ghostBtn, padding: '8px 12px',
                  background: privacyMode ? `${T.accent.orange}10` : 'transparent',
                  borderColor: privacyMode ? `${T.accent.orange}55` : T.border.medium,
                  color: privacyMode ? T.accent.orange : T.text.secondary,
                }}
              >
                {privacyMode ? <EyeOff size={13} /> : <Eye size={13} />}
                {privacyMode ? t('פרטי', 'Private') : t('גלוי', 'Visible')}
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 34, height: 34, borderRadius: T.radius.sm,
                  background: 'transparent', border: `1px solid ${T.border.medium}`,
                  color: T.text.muted, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              ><X size={15} /></button>
            </div>
          </header>

          <div className="orca-settings-body" style={{ flex: 1, overflowY: 'auto', padding: '26px 26px 40px', WebkitOverflowScrolling: 'touch' }}>
            {/* ============ ACCOUNT ============ */}
            {tab === 'account' && (() => {
              const handleChangePassword = async () => {
                if (newPassword.length < 6) { toast.error(t('סיסמה חייבת להכיל לפחות 6 תווים', 'Password must be at least 6 characters')); return; }
                if (newPassword !== newPasswordConfirm) { toast.error(t('הסיסמאות אינן תואמות', 'Passwords do not match')); return; }
                setPwBusy(true);
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  toast.success(t('הסיסמה עודכנה בהצלחה', 'Password updated successfully'));
                  setNewPassword(''); setNewPasswordConfirm('');
                } catch (err) {
                  toast.error(translateAuthError(err instanceof Error ? err.message : String(err)));
                } finally { setPwBusy(false); }
              };
              const handleChangeEmail = async () => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { toast.error(t('כתובת אימייל לא תקינה', 'Invalid email')); return; }
                setEmailBusy(true);
                try {
                  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
                  if (error) throw error;
                  toast.success(t('נשלח אימייל אישור לכתובת החדשה', 'Confirmation email sent to the new address'));
                  setNewEmail('');
                } catch (err) {
                  toast.error(translateAuthError(err instanceof Error ? err.message : String(err)));
                } finally { setEmailBusy(false); }
              };
              const handleSendReset = async () => {
                if (!auth.user?.email) return;
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(auth.user.email, { redirectTo: `${window.location.origin}/reset-password` });
                  if (error) throw error;
                  toast.success(t('שלחנו לך מייל לאיפוס סיסמה', 'Password reset email sent'));
                } catch (err) {
                  toast.error(translateAuthError(err instanceof Error ? err.message : String(err)));
                }
              };
              const created = auth.user?.created_at ? new Date(auth.user.created_at) : null;
              return (
                <div>
                  {/* Hero card */}
                  <div style={{
                    ...card, padding: 22,
                    background: `linear-gradient(135deg, ${T.bg.primary}, ${T.bg.tertiary})`,
                    display: 'flex', alignItems: 'center', gap: 18,
                  }}>
                    <AvatarUploader T={T} size={72} isRTL={isRTL} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, marginBottom: 4 }} dir="ltr">
                        {auth.user?.email ?? '—'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: T.text.muted }}>
                        <span style={{ fontFamily: mono }}>ID: {auth.user?.id?.slice(0, 8)}…</span>
                        {created && <span>{t('הצטרף/ה', 'Joined')}: {created.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.accent.green }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent.green }} />
                          {t('פעיל', 'Active')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><KeyRound size={14} /> {t('שינוי סיסמה', 'Change password')}</h3>
                    <p style={sectionHint}>{t('סיסמה חייבת להיות באורך 6 תווים לפחות. השינוי מיידי.', 'Minimum 6 characters. Change applies immediately.')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={fieldLabel}>{t('סיסמה חדשה', 'New password')}</label>
                        <input className="orca-settings-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" style={input} dir="ltr" />
                      </div>
                      <div>
                        <label style={fieldLabel}>{t('אימות', 'Confirm')}</label>
                        <input className="orca-settings-input" type="password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} autoComplete="new-password" style={input} dir="ltr" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="orca-cta" onClick={handleChangePassword} disabled={pwBusy || !newPassword || !newPasswordConfirm} style={primaryBtn(T.accent.cyan, pwBusy || !newPassword || !newPasswordConfirm)}>
                        <Check size={13} /> {pwBusy ? t('מעדכן…', 'Updating…') : t('עדכן סיסמה', 'Update password')}
                      </button>
                      <button onClick={handleSendReset} style={ghostBtn}>
                        <Send size={13} /> {t('שלח מייל איפוס', 'Send reset email')}
                      </button>
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><Mail size={14} /> {t('שינוי כתובת אימייל', 'Change email address')}</h3>
                    <p style={sectionHint}>{t('יישלח אליך מייל אישור לכתובת החדשה. השינוי ייכנס לתוקף רק לאחר אישור.', 'A confirmation email will be sent to the new address. Change applies after confirmation.')}</p>
                    <label style={fieldLabel}>{t('אימייל חדש', 'New email')}</label>
                    <input className="orca-settings-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoComplete="email" style={{ ...input, marginBottom: 12 }} dir="ltr" placeholder="name@example.com" />
                    <button className="orca-cta" onClick={handleChangeEmail} disabled={emailBusy || !newEmail} style={primaryBtn(T.accent.blue, emailBusy || !newEmail)}>
                      <Check size={13} /> {emailBusy ? t('שולח…', 'Sending…') : t('עדכן אימייל', 'Update email')}
                    </button>
                  </div>

                  <div style={{ ...card, borderColor: `${T.accent.orange}40`, background: `linear-gradient(135deg, ${T.accent.orange}08, transparent)` }}>
                    <h3 style={{ ...sectionTitle, color: T.accent.orange }}><AlertTriangle size={14} /> {t('יציאה מהמערכת', 'Sign out')}</h3>
                    <p style={sectionHint}>{t('יציאה תנתק אותך מהמכשיר הזה. הנתונים שלך נשמרים בענן ויהיו זמינים בכניסה הבאה.', 'Signs you out from this device. Your data stays in the cloud and will be available next sign-in.')}</p>
                    <button onClick={async () => { await auth.signOut(); window.location.href = '/auth'; }} style={{ ...ghostBtn, color: T.accent.orange, borderColor: `${T.accent.orange}55` }}>
                      <LogOut size={13} /> {t('התנתק עכשיו', 'Sign out now')}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ============ APPEARANCE ============ */}
            {tab === 'appearance' && (
              <div>
                <div style={card}>
                  <h3 style={sectionTitle}><Palette size={14} /> {t('ערכת נושא', 'Color theme')}</h3>
                  <p style={sectionHint}>{t('בחר ערכה ויזואלית. השינוי מיידי בכל האפליקציה.', 'Pick a visual scheme. Applies instantly across the app.')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {THEME_OPTIONS.map(opt => {
                      const active = theme === opt.id;
                      return (
                        <button key={opt.id} onClick={() => setTheme(opt.id)} style={{
                          padding: 14, borderRadius: T.radius.md, cursor: 'pointer',
                          textAlign: isRTL ? 'right' : 'left' as const,
                          background: active ? T.bg.tertiary : T.bg.secondary,
                          border: `2px solid ${active ? T.accent.cyan : T.border.subtle}`,
                          boxShadow: active ? T.shadow.glow(T.accent.cyanGlow) : 'none',
                          transition: 'all .18s', fontFamily: sans,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: T.text.primary }}>{opt.label[isRTL ? 'he' : 'en']}</div>
                              <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 2 }}>{opt.sub[isRTL ? 'he' : 'en']}</div>
                            </div>
                            {active && <Check size={14} color={T.accent.cyan} strokeWidth={3} />}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {opt.preview.map((c, i) => (
                              <div key={i} style={{ flex: 1, height: 32, borderRadius: 5, background: c, border: `1px solid ${T.border.subtle}` }} />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={card}>
                  <h3 style={sectionTitle}><Globe size={14} /> {t('שפה', 'Language')}</h3>
                  <p style={sectionHint}>{t('בחר את שפת הממשק. ההחלפה מיידית בכל המסכים.', 'Choose interface language. Switches instantly app-wide.')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(['he', 'en'] as Lang[]).map(L => {
                      const active = lang === L;
                      return (
                        <button key={L} onClick={() => setLang(L)} style={{
                          padding: '14px 16px', borderRadius: T.radius.md, cursor: 'pointer',
                          background: active ? `${T.accent.cyan}14` : T.bg.primary,
                          border: `2px solid ${active ? T.accent.cyan : T.border.subtle}`,
                          color: active ? T.accent.cyan : T.text.primary,
                          fontSize: 14, fontWeight: 800, fontFamily: sans,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span>{L === 'he' ? '🇮🇱  עברית' : '🇺🇸  English'}</span>
                          {active && <Check size={15} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={card}>
                  <h3 style={sectionTitle}><Eye size={14} /> {t('מצב פרטיות', 'Privacy mode')}</h3>
                  <p style={sectionHint}>{t('מסתיר ערכים כספיים ברחבי האפליקציה. שימושי בצילום מסך או בעבודה במרחב ציבורי.', 'Masks money values across the app. Useful for screenshots or working in public.')}</p>
                  <button onClick={() => setPrivacyMode(!privacyMode)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    width: '100%', padding: '14px 16px', borderRadius: T.radius.md,
                    background: T.bg.primary, border: `1px solid ${privacyMode ? T.accent.orange : T.border.subtle}`,
                    cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' as const, fontFamily: sans,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>
                        {privacyMode ? t('פרטיות מופעלת', 'Privacy ON') : t('פרטיות כבויה', 'Privacy OFF')}
                      </div>
                      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>
                        {privacyMode ? t('כל הסכומים מוסתרים', 'All amounts are masked') : t('הסכומים מוצגים', 'Amounts are visible')}
                      </div>
                    </div>
                    <div style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', background: privacyMode ? T.accent.orange : T.bg.tertiary, transition: 'background .15s' }}>
                      <div style={{ position: 'absolute', top: 2, insetInlineStart: privacyMode ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'inset-inline-start .15s' }} />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ============ DASHBOARD ============ */}
            {tab === 'dashboard' && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <h3 style={sectionTitle}><LayoutDashboard size={14} /> {t('ווידג׳טים בדאשבורד', 'Dashboard widgets')}</h3>
                    <p style={sectionHint}>{t('גרור לסידור מחדש. לחץ על העין כדי להציג או להסתיר.', 'Drag to reorder. Click the eye to show or hide.')}</p>
                  </div>
                  <button onClick={dash.resetLayout} style={ghostBtn}>
                    <RotateCcw size={12} /> {t('איפוס', 'Reset')}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {dash.layout.map((w, idx) => {
                    const isDrag = dragIdx === idx;
                    const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
                    return (
                      <div key={w.id}
                        draggable
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={e => { e.preventDefault(); setOverIdx(idx); }}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                        onDrop={() => { if (dragIdx !== null && dragIdx !== idx) dash.moveWidget(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
                        style={{
                          padding: '12px 14px', borderRadius: T.radius.md, cursor: 'grab',
                          background: isOver ? `${T.accent.cyan}18` : T.bg.secondary,
                          border: `1px solid ${isOver ? T.accent.cyan : T.border.subtle}`,
                          opacity: isDrag ? 0.4 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all .15s', userSelect: 'none',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <GripVertical size={15} color={T.text.muted} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: w.visible ? T.text.primary : T.text.muted }}>
                            {WIDGET_LABELS[w.id]?.[isRTL ? 'he' : 'en'] || w.id}
                          </span>
                        </div>
                        <button onClick={() => dash.toggleWidget(w.id)} style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: w.visible ? T.accent.cyan : T.text.muted,
                          display: 'grid', placeItems: 'center', padding: 4,
                        }}>
                          {w.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============ KPIs ============ */}
            {tab === 'kpis' && (
              <div>
                <div style={card}>
                  <h3 style={sectionTitle}><Calculator size={14} /> {t('המדדים שלך', 'Your KPIs')}</h3>
                  <p style={sectionHint}>{t('צור מדדים מותאמים אישית באמצעות נוסחאות מתמטיות.', 'Build custom metrics with mathematical formulas.')}</p>

                  {dash.kpis.length === 0 && (
                    <div style={{
                      padding: 24, textAlign: 'center', borderRadius: T.radius.md,
                      border: `1px dashed ${T.border.medium}`, color: T.text.muted, fontSize: 12,
                    }}>{t('עדיין לא הוגדרו מדדים מותאמים', 'No custom KPIs yet')}</div>
                  )}

                  {dash.kpis.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dash.kpis.map(k => {
                        const val = evalCustomKPI(k.formula, ctx);
                        return (
                          <div key={k.id} style={{
                            padding: '12px 14px', borderRadius: T.radius.md,
                            background: T.bg.secondary, border: `1px solid ${T.border.subtle}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>{k.label}</div>
                              <div style={{ fontSize: 10.5, color: T.text.muted, fontFamily: mono, marginTop: 2 }}>= {k.formula}</div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: val !== null ? T.accent.cyan : T.accent.red, fontFamily: mono }}>
                              {val !== null
                                ? (k.format === 'currency' ? `$${val.toFixed(2)}`
                                  : k.format === 'percent' ? `${val.toFixed(1)}%`
                                  : k.format === 'r-multiple' ? `${val.toFixed(2)}R`
                                  : val.toFixed(2))
                                : 'ERR'}
                            </div>
                            <button onClick={() => dash.setKpis(dash.kpis.filter(x => x.id !== k.id))}
                              style={{ background: 'transparent', border: `1px solid ${T.border.medium}`, color: T.accent.red, width: 30, height: 30, borderRadius: T.radius.sm, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={card}>
                  <h3 style={sectionTitle}><Plus size={14} /> {t('מדד חדש', 'Add new KPI')}</h3>
                  <p style={sectionHint}>{t('הזן שם, נוסחה ופורמט. לדוגמה: totalPnl / Math.abs(maxDrawdown)', 'Enter a label, formula and format. Example: totalPnl / Math.abs(maxDrawdown)')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={fieldLabel}>{t('שם', 'Label')}</label>
                      <input className="orca-settings-input" value={newKpi.label || ''} onChange={e => setNewKpi(p => ({ ...p, label: e.target.value }))} placeholder={t('Risk-Adjusted Return', 'Risk-Adjusted Return')} style={{ ...input, fontFamily: sans }} />
                    </div>
                    <div>
                      <label style={fieldLabel}>{t('פורמט', 'Format')}</label>
                      <select value={newKpi.format || 'number'} onChange={e => setNewKpi(p => ({ ...p, format: e.target.value as CustomKPI['format'] }))} style={{ ...input, fontFamily: sans }}>
                        <option value="number">{t('מספר', 'Number')}</option>
                        <option value="currency">{t('מטבע ($)', 'Currency ($)')}</option>
                        <option value="percent">{t('אחוז (%)', 'Percent (%)')}</option>
                        <option value="r-multiple">R-Multiple</option>
                      </select>
                    </div>
                  </div>
                  <label style={fieldLabel}>{t('נוסחה', 'Formula')}</label>
                  <input className="orca-settings-input" value={newKpi.formula || ''} onChange={e => setNewKpi(p => ({ ...p, formula: e.target.value }))} placeholder="totalPnl / Math.abs(maxDrawdown)" style={{ ...input, marginBottom: 12 }} dir="ltr" />
                  <button className="orca-cta" onClick={() => {
                    if (!newKpi.label || !newKpi.formula) return;
                    const result = evalCustomKPI(newKpi.formula, ctx);
                    if (result === null) { toast.error(t('נוסחה לא תקינה', 'Invalid formula')); return; }
                    dash.setKpis([...dash.kpis, { id: `kpi_${Date.now()}`, label: newKpi.label!, formula: newKpi.formula!, format: newKpi.format || 'number' }]);
                    setNewKpi({ label: '', formula: '', format: 'number' });
                    toast.success(t('המדד נוסף', 'KPI added'));
                  }} style={primaryBtn(T.accent.cyan, !newKpi.label || !newKpi.formula)} disabled={!newKpi.label || !newKpi.formula}>
                    <Plus size={13} /> {t('הוסף מדד', 'Add KPI')}
                  </button>
                  <div style={{ marginTop: 14, padding: 12, borderRadius: T.radius.sm, background: T.bg.secondary, border: `1px solid ${T.border.subtle}`, fontSize: 10.5, color: T.text.muted, fontFamily: mono, lineHeight: 1.7 }}>
                    <strong style={{ color: T.text.secondary }}>{t('טוקנים זמינים:', 'Available tokens:')}</strong> {TOKEN_LIST.join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* ============ RISK ============ */}
            {tab === 'risk' && (() => {
              const cur = pendingLimits || {
                trade: String(Math.abs(riskCfg.limits.trade)), day: String(Math.abs(riskCfg.limits.day)),
                week: String(Math.abs(riskCfg.limits.week)), month: String(Math.abs(riskCfg.limits.month)),
              };
              const dirty = pendingLimits !== null && (
                parseFloat(cur.trade) !== Math.abs(riskCfg.limits.trade) ||
                parseFloat(cur.day) !== Math.abs(riskCfg.limits.day) ||
                parseFloat(cur.week) !== Math.abs(riskCfg.limits.week) ||
                parseFloat(cur.month) !== Math.abs(riskCfg.limits.month)
              );
              const update = (k: 'trade' | 'day' | 'week' | 'month') => (e: React.ChangeEvent<HTMLInputElement>) =>
                setPendingLimits(p => ({ ...(p || cur), [k]: e.target.value }));
              const apply = () => {
                const trade = parseFloat(cur.trade); const day = parseFloat(cur.day);
                const week = parseFloat(cur.week); const month = parseFloat(cur.month);
                if (![trade, day, week, month].every(n => isFinite(n) && n > 0)) {
                  toast.error(t('כל הערכים חייבים להיות חיוביים', 'All values must be positive')); return;
                }
                riskCfg.setLimits({ trade: -trade, day: -day, week: -week, month: -month });
                setPendingLimits(null);
                toast.success(t('המגבלות נשמרו', 'Limits saved'));
              };
              const limitCell = (label: string, key: 'trade' | 'day' | 'week' | 'month', val: string, hint: string) => (
                <div style={{ padding: 14, borderRadius: T.radius.md, background: T.bg.secondary, border: `1px solid ${T.border.subtle}` }}>
                  <div style={fieldLabel}>{label}</div>
                  <input type="number" step="0.1" min="0.1" value={val} onChange={update(key)}
                    style={{ ...input, textAlign: 'center', fontWeight: 800, fontSize: 16 }} className="orca-settings-input" />
                  <div style={{ fontSize: 10, color: T.text.muted, marginTop: 6, textAlign: 'center' }}>−{val}R · {hint}</div>
                </div>
              );
              return (
                <div>
                  <div style={card}>
                    <h3 style={sectionTitle}><Shield size={14} /> {t('מגבלות הפסד ב־R', 'Loss limits in R')}</h3>
                    <p style={sectionHint}>{t('הגדר את המגבלות שלך. המערכת תתריע ותציע לעצור כשמתקרבים אליהן.', 'Define your loss budget. The system warns and suggests to stop as you approach.')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      {limitCell(t('סיכון לעסקה', 'Per-Trade'), 'trade', cur.trade, t('עסקה אחת', 'single trade'))}
                      {limitCell(t('הפסד יומי', 'Daily'), 'day', cur.day, t('ביום מסחר', 'per trading day'))}
                      {limitCell(t('הפסד שבועי', 'Weekly'), 'week', cur.week, t('בשבוע מסחר', 'per trading week'))}
                      {limitCell(t('הפסד חודשי', 'Monthly'), 'month', cur.month, t('בחודש מסחר', 'per trading month'))}
                    </div>
                    <div style={{
                      marginTop: 14, padding: '12px 14px', borderRadius: T.radius.md,
                      background: `linear-gradient(135deg, ${T.accent.orange}10, transparent)`,
                      border: `1px solid ${T.accent.orange}30`, fontSize: 11.5, color: T.text.secondary, lineHeight: 1.6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: T.accent.orange, marginBottom: 4, fontSize: 11 }}>
                        <Sparkles size={12} /> {t('המלצה מקצועית', 'Professional guideline')}
                      </div>
                      {t('יום ≤ 2× עסקה  ·  שבוע ≤ 5× עסקה  ·  חודש ≤ 10× עסקה', 'Day ≤ 2× per-trade  ·  Week ≤ 5× per-trade  ·  Month ≤ 10× per-trade')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="orca-cta" onClick={apply} disabled={!dirty} style={{ ...primaryBtn(T.accent.cyan, !dirty), flex: 1 }}>
                        <Check size={13} /> {dirty ? t('שמור מגבלות', 'Save limits') : t('נשמר', 'Saved')}
                      </button>
                      <button onClick={() => { riskCfg.reset(); setPendingLimits(null); toast.success(t('אופס', 'Reset')); }} style={ghostBtn}>
                        <RotateCcw size={12} /> {t('ברירת מחדל', 'Reset')}
                      </button>
                    </div>
                    <div style={{ fontSize: 9.5, color: T.text.dim, marginTop: 10, textAlign: 'center', fontFamily: mono }}>
                      {t('ברירת מחדל:', 'Default:')} −{Math.abs(DEFAULT_RISK_LIMITS.trade)}R / −{Math.abs(DEFAULT_RISK_LIMITS.day)}R / −{Math.abs(DEFAULT_RISK_LIMITS.week)}R / −{Math.abs(DEFAULT_RISK_LIMITS.month)}R
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ============ INTERFACE ============ */}
            {tab === 'interface' && (() => {
              const p = ui.prefs;
              const modes: { id: OperatingMode; label: string }[] = [
                { id: 'beginner', label: t('🎓 מתחיל', '🎓 Beginner') },
                { id: 'live', label: t('🔴 חי', '🔴 Live') },
                { id: 'review', label: t('🔵 סקירה', '🔵 Review') },
                { id: 'research', label: t('🟣 מחקר', '🟣 Research') },
              ];
              const Toggle = ({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) => (
                <button onClick={onClick} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  width: '100%', padding: '12px 14px', borderRadius: T.radius.md,
                  background: T.bg.secondary, border: `1px solid ${on ? T.accent.cyan : T.border.subtle}`,
                  cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' as const, marginBottom: 6, fontFamily: sans,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>{label}</div>
                    {hint && <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 2 }}>{hint}</div>}
                  </div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', background: on ? T.accent.cyan : T.bg.tertiary, transition: 'background .15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, insetInlineStart: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'inset-inline-start .15s' }} />
                  </div>
                </button>
              );
              return (
                <div>
                  <div style={card}>
                    <h3 style={sectionTitle}><LayoutDashboard size={14} /> {t('מצבי תפעול בנאב-בר', 'Operating modes in nav')}</h3>
                    <p style={sectionHint}>{t('בחר אילו מצבי תפעול יוצגו במעבר המהיר.', 'Choose which operating modes appear in the quick switcher.')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {modes.map(m => {
                        const hidden = p.hiddenOperatingModes.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => ui.toggleHiddenMode(m.id)} style={{
                            padding: '10px 12px', borderRadius: T.radius.md,
                            background: hidden ? T.bg.tertiary : `${T.accent.cyan}10`,
                            border: `1px solid ${hidden ? T.border.subtle : T.accent.cyan}`,
                            color: hidden ? T.text.muted : T.accent.cyan,
                            cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            textAlign: isRTL ? 'right' : 'left' as const, fontFamily: sans,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          }}>
                            <span>{m.label}</span>
                            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><SlidersHorizontal size={14} /> {t('הסתרת אלמנטים', 'Hide UI elements')}</h3>
                    <p style={sectionHint}>{t('צמצום הממשק לפעולות הליבה שלך.', 'Reduce the interface to your core actions.')}</p>
                    <Toggle on={p.hideQuickActions} onClick={() => ui.setPrefs({ hideQuickActions: !p.hideQuickActions })} label={t('הסתר Quick Actions', 'Hide Quick Actions')} />
                    <Toggle on={p.hideDepthSwitch} onClick={() => ui.setPrefs({ hideDepthSwitch: !p.hideDepthSwitch })} label={t('הסתר מתג Standard/Alpha', 'Hide Standard/Alpha switch')} />
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><Gauge size={14} /> {t('צפיפות תצוגה', 'Display density')}</h3>
                    <p style={sectionHint}>{t('בחר עד כמה הממשק דחוס. משפיע על ריווח גלובלי וטבלאות.', 'How tightly the UI is packed. Affects global spacing and tables.')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {(['compact', 'comfortable', 'spacious'] as const).map(d => {
                        const active = p.density === d;
                        return (
                          <button key={d} onClick={() => ui.setPrefs({ density: d })} style={{
                            padding: '12px 10px', borderRadius: T.radius.md, cursor: 'pointer',
                            background: active ? `${T.accent.cyan}14` : T.bg.secondary,
                            border: `2px solid ${active ? T.accent.cyan : T.border.subtle}`,
                            color: active ? T.accent.cyan : T.text.primary,
                            fontSize: 12, fontWeight: 800, fontFamily: sans,
                          }}>
                            {d === 'compact' ? t('דחוס', 'Compact') : d === 'comfortable' ? t('נוח', 'Comfortable') : t('מרווח', 'Spacious')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><Type size={14} /> {t('גודל טקסט גלובלי', 'Global font scale')}</h3>
                    <p style={sectionHint}>{t('משנה את גודל הבסיס בכל האפליקציה. ערך נוכחי: ', 'Scales the base font size everywhere. Current: ')}<strong style={{ color: T.text.primary, fontFamily: mono }}>{Math.round(p.fontScale * 100)}%</strong></p>
                    <input type="range" min={0.85} max={1.2} step={0.01} value={p.fontScale}
                      onChange={e => ui.setPrefs({ fontScale: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: T.accent.cyan }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text.muted, fontFamily: mono, marginTop: 4 }}>
                      <span>85%</span><span>100%</span><span>120%</span>
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={sectionTitle}><Sparkles size={14} /> {t('ביצועים ונוחות', 'Performance & comfort')}</h3>
                    <Toggle on={p.reduceMotion} onClick={() => ui.setPrefs({ reduceMotion: !p.reduceMotion })} label={t('הפחת אנימציות', 'Reduce motion')} hint={t('משבית מעברים והנפשות לחווית עבודה רגועה', 'Disables transitions across the app')} />
                    <Toggle on={p.denseTables} onClick={() => ui.setPrefs({ denseTables: !p.denseTables })} label={t('טבלאות צפופות', 'Dense tables')} hint={t('יותר שורות במסך אחד', 'More rows visible at once')} />
                    <button onClick={ui.reset} style={{ ...ghostBtn, marginTop: 8 }}>
                      <RotateCcw size={12} /> {t('ברירת מחדל לכל ההעדפות', 'Reset all preferences')}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ============ THEME STUDIO ============ */}
            {tab === 'theme-studio' && (() => {
              const p = ui.prefs;
              const locked = ui.themeLocked;
              const msLeft = ui.themeLockMsRemaining;
              const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
              const minsLeft = Math.ceil(msLeft / (60 * 1000));
              const lockText = hoursLeft > 1 ? t(`עוד ${hoursLeft} שעות`, `${hoursLeft}h left`) : t(`עוד ${minsLeft} דקות`, `${minsLeft}m left`);

              const draft = draftAccent;
              const setDraft = setDraftAccent;
              const isLight = theme === 'platinum';
              const sketch = deriveFullPalette(draft, isLight ? 'light' : 'dark');
              const swatches = sketch?.preview;

              const handleCommit = () => {
                if (locked) {
                  toast.error(t(`נעול ליום. ${lockText}`, `Locked for 1 day. ${lockText}`));
                  return;
                }
                if (!/^#[0-9a-f]{6}$/i.test(draft)) {
                  toast.error(t('צבע לא תקין', 'Invalid hex color'));
                  return;
                }
                setShowThemeConfirm(true);
              };
              const confirmCommit = () => {
                setShowThemeConfirm(false);
                ui.commitCustomAccent(draft);
                playMorningLock();
                toast.success(t('הפלטה נשמרה ונעולה ליום', 'Palette committed and locked for 1 day'));
              };

              return (
                <div>
                  {/* Status / lock banner */}
                  <div style={{
                    ...card,
                    background: locked
                      ? `linear-gradient(135deg, ${T.accent.orange}10, transparent)`
                      : p.customAccentEnabled
                        ? `linear-gradient(135deg, ${p.customAccent}18, transparent)`
                        : T.bg.primary,
                    borderColor: locked ? `${T.accent.orange}40` : p.customAccentEnabled ? `${p.customAccent}40` : T.border.subtle,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: T.radius.lg, flexShrink: 0,
                      background: p.customAccentEnabled ? p.customAccent : T.bg.tertiary,
                      boxShadow: p.customAccentEnabled ? `0 0 28px ${p.customAccent}55` : 'none',
                      border: `2px solid ${T.border.medium}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.text.primary }}>
                        {p.customAccentEnabled
                          ? t('פלטה אישית פעילה', 'Custom palette active')
                          : t('פלטה אישית כבויה — משתמש בערכת הבסיס', 'Custom palette off — using base theme')}
                      </div>
                      <div style={{ fontSize: 11, color: T.text.muted, fontFamily: mono, marginTop: 3 }}>
                        {p.customAccentEnabled ? p.customAccent.toUpperCase() : '—'}
                        {locked && <span style={{ color: T.accent.orange, marginInlineStart: 10, fontWeight: 800 }}>🔒 {lockText}</span>}
                      </div>
                    </div>
                    {p.customAccentEnabled && !locked && (
                      <button onClick={() => { ui.removeCustomAccent(); toast.success(t('הוסר', 'Removed')); }}
                        style={{ ...ghostBtn, color: T.accent.orange, borderColor: `${T.accent.orange}55` }}>
                        <X size={13} /> {t('הסר פלטה', 'Remove')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        ui.removeCustomAccent();
                        ui.removeCustomTheme();
                        ui.unlockTheme();
                        setTheme('midnight');
                        setDraftAccent('#00f2ff');
                        toast.success(t('הצבעים אופסו לברירת המחדל (חצות)', 'Colors reset to default (Midnight)'));
                      }}
                      style={{ ...ghostBtn, color: T.accent.blue, borderColor: `${T.accent.blue}55` }}
                      title={t('אפס הכל לערכת חצות ברירת המחדל', 'Reset everything to the default Midnight theme')}
                    >
                      <RotateCcw size={13} /> {t('ברירת מחדל', 'Default')}
                    </button>
                  </div>

                  {/* COLOR PICKER */}
                  <div style={{ ...card, opacity: locked ? 0.55 : 1 }}>
                    <h3 style={sectionTitle}><Brush size={14} /> {t('בחר צבע בסיס', 'Pick base color')}</h3>
                    <p style={sectionHint}>
                      {t('צבע אחד — אורקה גוזרת ממנו את כל הפלטה: רקעים, משטחים, גבולות, אורות, פוקוס וצללים. אפשר לבחור פעם ביום בשביל יציבות.',
                         'Pick one color — Orca derives the entire palette: surfaces, borders, glows, focus and shadows. Limited to one change per day for stability.')}
                    </p>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                      <input type="color" value={draft} disabled={locked}
                        onChange={e => setDraft(e.target.value)}
                        style={{ width: 64, height: 44, border: 'none', borderRadius: T.radius.sm, background: 'transparent', cursor: locked ? 'not-allowed' : 'pointer' }} />
                      <input className="orca-settings-input" value={draft} disabled={locked}
                        onChange={e => setDraft(e.target.value)}
                        placeholder="#00f2ff" dir="ltr" style={{ ...input, fontFamily: mono, maxWidth: 200 }} />
                      <span style={{ fontSize: 10.5, color: T.text.muted, fontFamily: mono }}>
                        H {sketch ? sketch.primary.split(' ')[0] : '—'}°
                      </span>
                    </div>

                    <label style={fieldLabel}>{t('דוגמיות מהירות', 'Quick swatches')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, marginBottom: 4 }}>
                      {ACCENT_PRESETS.map(c => {
                        const active = draft.toLowerCase() === c.toLowerCase();
                        return (
                          <button key={c} onClick={() => !locked && setDraft(c)} disabled={locked} title={c}
                            style={{
                              aspectRatio: '1', borderRadius: T.radius.sm, cursor: locked ? 'not-allowed' : 'pointer',
                              background: c, border: `2px solid ${active ? '#fff' : 'transparent'}`,
                              boxShadow: active ? `0 0 14px ${c}` : 'none', transition: 'all .15s',
                            }} />
                        );
                      })}
                    </div>
                  </div>

                  {/* SKETCH PREVIEW (uses derived palette WITHOUT applying) */}
                  {swatches && (
                    <div style={card}>
                      <h3 style={sectionTitle}><Eye size={14} /> {t('סקיצת תצוגה — איך זה ייראה', 'Sketch preview — how it will look')}</h3>
                      <p style={sectionHint}>
                        {t('זוהי תצוגה ויזואלית של הפלטה הנגזרת. שום דבר עוד לא הופעל. לחץ "החל ונעל" אם זה מוצא חן בעיניך.',
                           'This is a visual preview of the derived palette. Nothing is applied yet. Click "Apply & Lock" if you like it.')}
                      </p>

                      {/* Mini-app sketch */}
                      <div style={{
                        borderRadius: T.radius.lg, overflow: 'hidden',
                        border: `1px solid ${T.border.medium}`, background: swatches.bg,
                        padding: 0, marginBottom: 14,
                      }}>
                        {/* Top bar */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                          background: swatches.surface, borderBottom: `1px solid ${swatches.soft}`,
                        }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: swatches.primary, boxShadow: `0 0 10px ${swatches.glow}` }} />
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>ORCA</div>
                          <div style={{ flex: 1 }} />
                          <div style={{ padding: '4px 10px', borderRadius: 6, background: swatches.soft, color: swatches.primary, fontSize: 10, fontFamily: mono }}>+12.4R</div>
                        </div>
                        {/* Body */}
                        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          {[1, 2, 3].map(i => (
                            <div key={i} style={{
                              padding: 12, borderRadius: 10, background: swatches.surface,
                              border: `1px solid ${swatches.soft}`,
                            }}>
                              <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>KPI {i}</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: swatches.primary, fontFamily: mono }}>${(i * 1234).toLocaleString()}</div>
                              <div style={{
                                height: 4, marginTop: 8, borderRadius: 2,
                                background: `linear-gradient(90deg, ${swatches.primary}, ${swatches.accent})`,
                                width: `${30 + i * 20}%`, boxShadow: `0 0 8px ${swatches.glow}`,
                              }} />
                            </div>
                          ))}
                        </div>
                        {/* CTA strip */}
                        <div style={{ display: 'flex', gap: 8, padding: 14, paddingTop: 0 }}>
                          <button style={{
                            padding: '10px 16px', borderRadius: 8, border: 'none',
                            background: swatches.primary, color: '#000',
                            fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            boxShadow: `0 4px 16px ${swatches.glow}`,
                          }}>{t('כפתור ראשי', 'Primary')}</button>
                          <button style={{
                            padding: '10px 16px', borderRadius: 8,
                            background: 'transparent', color: swatches.primary,
                            border: `1px solid ${swatches.primary}`, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          }}>{t('משני', 'Secondary')}</button>
                          <span style={{
                            padding: '6px 12px', borderRadius: 999,
                            background: swatches.soft, color: swatches.primary,
                            fontSize: 11, fontWeight: 700, fontFamily: mono, alignSelf: 'center',
                          }}>{t('מבטא', 'Accent')}</span>
                        </div>
                      </div>

                      {/* Token chips */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {[
                          { label: t('רקע', 'BG'), c: swatches.bg },
                          { label: t('משטח', 'Surface'), c: swatches.surface },
                          { label: t('ראשי', 'Primary'), c: swatches.primary },
                          { label: t('מבטא', 'Accent'), c: swatches.accent },
                          { label: t('רך', 'Soft'), c: swatches.soft },
                          { label: t('הילה', 'Glow'), c: swatches.glow },
                        ].map(s => (
                          <div key={s.label} style={{
                            borderRadius: T.radius.sm, padding: 8, textAlign: 'center',
                            background: T.bg.secondary, border: `1px solid ${T.border.subtle}`,
                          }}>
                            <div style={{ height: 22, borderRadius: 4, background: s.c, marginBottom: 4 }} />
                            <div style={{ fontSize: 9, color: T.text.muted, fontFamily: mono }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* COMMIT BUTTONS */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                        <button className="orca-cta" onClick={handleCommit} disabled={locked}
                          style={{
                            ...primaryBtn(swatches.primary, locked), flex: 1, padding: '12px 20px',
                            color: '#000', fontSize: 13, boxShadow: locked ? 'none' : `0 4px 20px ${swatches.glow}`,
                          }}>
                          {locked ? <>🔒 {t(`נעול — ${lockText}`, `Locked — ${lockText}`)}</> : <><Sparkles size={14} /> {t('החל ונעל ליום', 'Apply & Lock for 1 day')}</>}
                        </button>
                        <button onClick={() => setDraft(p.customAccent)} disabled={locked} style={ghostBtn}>
                          <RotateCcw size={12} /> {t('שחזר', 'Reset draft')}
                        </button>
                        <button
                          onClick={() => {
                            // Re-apply current accent to the DOM immediately, no page reload required.
                            try {
                              if (p.customAccentEnabled && p.customAccent) {
                                // Re-trigger the prefs effect by toggling a no-op patch
                                ui.setPrefs({ customAccent: p.customAccent });
                                window.dispatchEvent(new CustomEvent('orca:theme-refresh'));
                                toast.success(t('הצבעים הוחלו מחדש', 'Theme re-applied'));
                              }
                            } catch { /* noop */ }
                          }}
                          style={ghostBtn}
                          title={t('החל מחדש ללא רענון', 'Re-apply without page reload')}
                        >
                          <Sparkles size={12} /> {t('החל מיד', 'Apply now')}
                        </button>
                      </div>

                      {locked && (
                        <div style={{
                          marginTop: 10, padding: 10, borderRadius: T.radius.sm,
                          background: `${T.accent.orange}10`, border: `1px solid ${T.accent.orange}40`,
                          fontSize: 11, color: T.text.secondary, lineHeight: 1.6,
                        }}>
                          <strong style={{ color: T.accent.orange }}>🔒 {t('הפלטה נעולה', 'Palette locked')}.</strong>{' '}
                          {t('המנגנון מגביל החלפת פלטה לפעם אחת ביום בשביל יציבות חזותית. תוכל לערוך שוב ב', 'The system limits palette changes to once per day for visual stability. You can edit again on ')}
                          <strong>{new Date(p.customAccentLockedUntil).toLocaleString(isRTL ? 'he-IL' : 'en-US')}</strong>.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══════════ ADVANCED THEME STUDIO (multi-axis) ═══════════ */}
                  {(() => {
                    const dt = draftTheme;
                    const setDt = (patch: Partial<CustomTheme>) => setDraftTheme(prev => ({ ...prev, ...patch }));
                    const out = deriveFromCustomTheme(dt);
                    const pv = out?.preview;
                    const studioLocked = locked;

                    const moods: { id: BaseMood; he: string; en: string }[] = [
                      { id: 'cool', he: 'קר', en: 'Cool' },
                      { id: 'warm', he: 'חמים', en: 'Warm' },
                      { id: 'neutral', he: 'נייטרלי', en: 'Neutral' },
                      { id: 'monochrome', he: 'מונוכרום', en: 'Mono' },
                    ];

                    const slider = (label: string, val: number, min: number, max: number, onCh: (n: number) => void, suffix = '') => (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{label}</span>
                          <span style={{ fontFamily: mono, color: T.text.primary }}>{val}{suffix}</span>
                        </label>
                        <input type="range" min={min} max={max} value={val} disabled={studioLocked}
                          onChange={e => onCh(parseInt(e.target.value, 10))}
                          style={{ width: '100%', accentColor: dt.accentPrimary, opacity: studioLocked ? 0.5 : 1 }} />
                      </div>
                    );

                    const handleApply = () => {
                      if (studioLocked) { toast.error(t(`נעול ליום. ${lockText}`, `Locked for 1 day. ${lockText}`)); return; }
                      setShowStudioConfirm(true);
                    };
                    const confirmApply = () => {
                      setShowStudioConfirm(false);
                      ui.commitCustomTheme(dt);
                      playMorningLock();
                      toast.success(t('ערכת נושא מותאמת נשמרה ונעולה ליום', 'Custom theme committed and locked for 1 day'));
                    };

                    return (
                      <div style={{ ...card, borderColor: T.border.medium }}>
                        <h3 style={sectionTitle}>
                          <Sparkles size={14} /> {t('סטודיו צבעים מתקדם', 'Advanced Theme Studio')}
                          <span style={{ marginInlineStart: 'auto', fontSize: 9, color: T.text.muted, fontFamily: mono, padding: '2px 6px', borderRadius: 4, border: `1px solid ${T.border.subtle}` }}>BETA</span>
                        </h3>
                        <p style={sectionHint}>
                          {t('שלוט ב-7 צירים: מצב-רוח, גוון רקע, גובה משטח, שני מבטאים, גבולות והילה. תצוגה חיה — לא מוחל עד שתאשר.',
                             'Control 7 axes: mood, background hue, surface elevation, two accents, borders and glow. Live preview — nothing applies until you confirm.')}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                          {/* Mode + Mood */}
                          <div>
                            <label style={fieldLabel}>{t('מצב בסיס', 'Base mode')}</label>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                              {(['dark', 'light'] as const).map(m => (
                                <button key={m} disabled={studioLocked} onClick={() => setDt({ mode: m })}
                                  style={{
                                    flex: 1, padding: '8px 10px', borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700, cursor: studioLocked ? 'not-allowed' : 'pointer',
                                    background: dt.mode === m ? `${dt.accentPrimary}22` : T.bg.secondary,
                                    border: `1px solid ${dt.mode === m ? dt.accentPrimary : T.border.subtle}`,
                                    color: dt.mode === m ? dt.accentPrimary : T.text.secondary, fontFamily: sans,
                                  }}>{m === 'dark' ? t('כהה', 'Dark') : t('בהיר', 'Light')}</button>
                              ))}
                            </div>

                            <label style={fieldLabel}>{t('מצב-רוח', 'Base mood')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                              {moods.map(m => (
                                <button key={m.id} disabled={studioLocked} onClick={() => setDt({ baseMood: m.id })}
                                  style={{
                                    padding: '8px 10px', borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700, cursor: studioLocked ? 'not-allowed' : 'pointer',
                                    background: dt.baseMood === m.id ? `${dt.accentPrimary}22` : T.bg.secondary,
                                    border: `1px solid ${dt.baseMood === m.id ? dt.accentPrimary : T.border.subtle}`,
                                    color: dt.baseMood === m.id ? dt.accentPrimary : T.text.secondary, fontFamily: sans,
                                  }}>{t(m.he, m.en)}</button>
                              ))}
                            </div>
                          </div>

                          {/* Accents */}
                          <div>
                            <label style={fieldLabel}>{t('מבטא ראשי', 'Accent · Primary')}</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                              <input type="color" value={dt.accentPrimary} disabled={studioLocked}
                                onChange={e => setDt({ accentPrimary: e.target.value })}
                                style={{ width: 44, height: 36, border: 'none', borderRadius: 6, background: 'transparent', cursor: studioLocked ? 'not-allowed' : 'pointer' }} />
                              <input className="orca-settings-input" value={dt.accentPrimary} disabled={studioLocked}
                                onChange={e => setDt({ accentPrimary: e.target.value })}
                                dir="ltr" style={{ ...input, fontFamily: mono, flex: 1 }} />
                            </div>

                            <label style={fieldLabel}>{t('מבטא משני', 'Accent · Secondary')}</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input type="color" value={dt.accentSecondary} disabled={studioLocked}
                                onChange={e => setDt({ accentSecondary: e.target.value })}
                                style={{ width: 44, height: 36, border: 'none', borderRadius: 6, background: 'transparent', cursor: studioLocked ? 'not-allowed' : 'pointer' }} />
                              <input className="orca-settings-input" value={dt.accentSecondary} disabled={studioLocked}
                                onChange={e => setDt({ accentSecondary: e.target.value })}
                                dir="ltr" style={{ ...input, fontFamily: mono, flex: 1 }} />
                            </div>
                          </div>

                          {/* Sliders */}
                          <div>
                            {slider(t('הסטת גוון רקע', 'BG hue shift'), dt.bgHueShift, -30, 30, n => setDt({ bgHueShift: n }), '°')}
                            {slider(t('גובה משטח', 'Surface elevation'), dt.surfaceElevation, 0, 100, n => setDt({ surfaceElevation: n }), '%')}
                          </div>
                          <div>
                            {slider(t('עוצמת גבולות', 'Border intensity'), dt.borderIntensity, 0, 100, n => setDt({ borderIntensity: n }), '%')}
                            {slider(t('עוצמת הילה', 'Glow intensity'), dt.glowIntensity, 0, 100, n => setDt({ glowIntensity: n }), '%')}
                          </div>
                        </div>

                        {/* LIVE PREVIEW (sketch — not applied) */}
                        {pv && (
                          <div style={{
                            borderRadius: T.radius.lg, overflow: 'hidden',
                            border: `1px solid ${pv.border}`, background: pv.bg, marginBottom: 14,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: pv.surface, borderBottom: `1px solid ${pv.border}` }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: pv.primary, boxShadow: `0 0 12px ${pv.glow}` }} />
                              <div style={{ fontSize: 11, fontWeight: 800, color: dt.mode === 'light' ? '#0f172a' : '#fff', letterSpacing: 1 }}>ORCA · LIVE</div>
                              <div style={{ flex: 1 }} />
                              <div style={{ padding: '4px 10px', borderRadius: 6, background: pv.soft, color: pv.primary, fontSize: 10, fontFamily: mono }}>+12.4R</div>
                            </div>
                            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                              {[1, 2, 3].map(i => (
                                <div key={i} style={{ padding: 12, borderRadius: 10, background: pv.card, border: `1px solid ${pv.border}` }}>
                                  <div style={{ fontSize: 9, color: dt.mode === 'light' ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>KPI {i}</div>
                                  <div style={{ fontSize: 18, fontWeight: 800, color: i === 2 ? pv.accent : pv.primary, fontFamily: mono }}>${(i * 1234).toLocaleString()}</div>
                                  <div style={{ height: 4, marginTop: 8, borderRadius: 2, background: `linear-gradient(90deg, ${pv.primary}, ${pv.accent})`, width: `${30 + i * 20}%`, boxShadow: `0 0 8px ${pv.glow}` }} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, padding: 14, paddingTop: 0 }}>
                              <button style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: pv.primary, color: dt.mode === 'light' ? '#fff' : '#000', fontSize: 12, fontWeight: 800, boxShadow: `0 4px 18px ${pv.glow}`, cursor: 'default' }}>{t('כפתור ראשי', 'Primary')}</button>
                              <button style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', color: pv.accent, border: `1px solid ${pv.accent}`, fontSize: 12, fontWeight: 800, cursor: 'default' }}>{t('משני', 'Secondary')}</button>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={handleApply} disabled={studioLocked}
                            style={{
                              ...primaryBtn(dt.accentPrimary, studioLocked), flex: 1, minWidth: 180, padding: '12px 18px',
                              color: dt.mode === 'light' ? '#fff' : '#000', fontSize: 13,
                            }}>
                            {studioLocked ? <>🔒 {t('נעול', 'Locked')}</> : <><Sparkles size={14} /> {t('החל ונעל ליום', 'Apply & Lock for 1 day')}</>}
                          </button>
                          <button onClick={() => setDraftTheme(p.customTheme || CUSTOM_THEME_DEFAULT)} disabled={studioLocked} style={ghostBtn}>
                            <RotateCcw size={12} /> {t('שחזר', 'Reset')}
                          </button>
                          {p.customThemeEnabled && !studioLocked && (
                            <button onClick={() => { ui.removeCustomTheme(); toast.success(t('בוטל', 'Disabled')); }}
                              style={{ ...ghostBtn, color: T.accent.orange, borderColor: `${T.accent.orange}55` }}>
                              <X size={13} /> {t('כבה ערכה אישית', 'Disable custom theme')}
                            </button>
                          )}
                          {studioLocked && (
                            <button onClick={() => setUnlockStep(1)}
                              style={{ ...ghostBtn, color: T.accent.orange, borderColor: `${T.accent.orange}55` }}>
                              <AlertTriangle size={13} /> {t('בטל נעילה', 'Unlock now')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ============ SOUNDS ============ */}
            {tab === 'sounds' && (() => {
              const p = ui.prefs;
              return (
                <div>
                  <div style={card}>
                    <h3 style={sectionTitle}>{p.soundsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} {t('צלילי המערכת', 'System sounds')}</h3>
                    <p style={sectionHint}>{t('צלילים אקוסטיים מקצועיים בפעולות מפתח: פתיחה, נעילה ואזהרת סיכון.', 'Professional acoustic feedback on key actions: open, lock, risk warning.')}</p>

                    <button onClick={() => ui.setPrefs({ soundsEnabled: !p.soundsEnabled })} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      width: '100%', padding: '14px 16px', borderRadius: T.radius.md,
                      background: T.bg.primary, border: `1px solid ${p.soundsEnabled ? T.accent.cyan : T.border.subtle}`,
                      cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' as const, marginBottom: 14, fontFamily: sans,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>
                          {p.soundsEnabled ? t('צלילים מופעלים', 'Sounds ON') : t('צלילים כבויים', 'Sounds OFF')}
                        </div>
                        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>
                          {p.soundsEnabled ? t('כל פידבק אקוסטי פעיל', 'All acoustic feedback enabled') : t('האפליקציה דוממת לחלוטין', 'App stays completely silent')}
                        </div>
                      </div>
                      <div style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', background: p.soundsEnabled ? T.accent.cyan : T.bg.tertiary, transition: 'background .15s' }}>
                        <div style={{ position: 'absolute', top: 2, insetInlineStart: p.soundsEnabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'inset-inline-start .15s' }} />
                      </div>
                    </button>

                    <label style={fieldLabel}>{t('עוצמה', 'Volume')} · <span style={{ fontFamily: mono, color: T.text.primary }}>{Math.round(p.soundVolume * 100)}%</span></label>
                    <input type="range" min={0} max={1} step={0.01} value={p.soundVolume}
                      disabled={!p.soundsEnabled}
                      onChange={e => ui.setPrefs({ soundVolume: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: T.accent.cyan, opacity: p.soundsEnabled ? 1 : 0.4 }} />

                    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={playMorningLock} disabled={!p.soundsEnabled} style={primaryBtn(T.accent.cyan, !p.soundsEnabled)}>
                        <Zap size={13} /> {t('נגן דוגמה', 'Play sample')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ============ TRADING DEFAULTS ============ */}
            {tab === 'trading' && (() => {
              const p = ui.prefs;
              return (
                <div>
                  <div style={card}>
                    <h3 style={sectionTitle}><Target size={14} /> {t('סיכון ברירת מחדל', 'Default risk')}</h3>
                    <p style={sectionHint}>{t('הערכים הללו ייטענו אוטומטית בכל עסקה חדשה. אפשר תמיד לדרוס בעת ההזנה.', 'These values pre-fill every new trade. You can always override at entry time.')}</p>

                    <label style={fieldLabel}>{t('אחוז סיכון מהחשבון', 'Account risk %')} · <span style={{ fontFamily: mono, color: T.text.primary }}>{p.defaultRiskPercent.toFixed(2)}%</span></label>
                    <input type="range" min={0.1} max={5} step={0.05} value={p.defaultRiskPercent}
                      onChange={e => ui.setPrefs({ defaultRiskPercent: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: T.accent.cyan, marginBottom: 16 }} />

                    <label style={fieldLabel}>{t('יעד R לעסקה', 'Default R target')} · <span style={{ fontFamily: mono, color: T.text.primary }}>{p.defaultRMultiple.toFixed(1)}R</span></label>
                    <input type="range" min={0.5} max={5} step={0.1} value={p.defaultRMultiple}
                      onChange={e => ui.setPrefs({ defaultRMultiple: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: T.accent.cyan }} />

                    <div style={{
                      marginTop: 18, padding: 12, borderRadius: T.radius.md,
                      background: `linear-gradient(135deg, ${T.accent.cyan}10, transparent)`,
                      border: `1px solid ${T.accent.cyan}30`, fontSize: 11.5, color: T.text.secondary, lineHeight: 1.65,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: T.accent.cyan, marginBottom: 4, fontSize: 11 }}>
                        <Sparkles size={12} /> {t('המלצה', 'Guideline')}
                      </div>
                      {t('סיכון 0.5%–1% לעסקה ויעד 2R+ הם הסטנדרט המקצועי.', '0.5%–1% risk per trade and 2R+ targets are the professional standard.')}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ============ DATA ============ */}
            {tab === 'data' && (() => {
              const total = trades.length;
              const winsD = trades.filter(tr => tr.winLoss === 'Win').length;
              const lossesD = trades.filter(tr => tr.winLoss === 'Loss').length;
              const exportJson = () => {
                const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user_email: auth.user?.email, trades }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `orca-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
                URL.revokeObjectURL(url);
                toast.success(t('הגיבוי הורד בהצלחה', 'Backup downloaded'));
              };
              const stat = (label: string, value: number | string, color: string) => (
                <div style={{ padding: 16, borderRadius: T.radius.md, background: T.bg.secondary, border: `1px solid ${T.border.subtle}`, textAlign: 'center' }}>
                  <div style={fieldLabel}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: mono, marginTop: 4 }}>{value}</div>
                </div>
              );
              return (
                <div>
                  <div style={card}>
                    <h3 style={sectionTitle}><Database size={14} /> {t('סקירת נתונים', 'Data overview')}</h3>
                    <p style={sectionHint}>{t('הנתונים שלך מאוחסנים בענן ומסונכרנים בין המכשירים.', 'Your data lives in the cloud and syncs across devices.')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {stat(t('סך עסקאות', 'Total'), total, T.accent.cyan)}
                      {stat(t('זכיות', 'Wins'), winsD, T.accent.green)}
                      {stat(t('הפסדים', 'Losses'), lossesD, T.accent.red)}
                    </div>
                  </div>
                  <div style={card}>
                    <h3 style={sectionTitle}><Download size={14} /> {t('גיבוי מקומי', 'Local backup')}</h3>
                    <p style={sectionHint}>{t('הורד קובץ JSON מלא הכולל את כל העסקאות, המטא-דאטה והאירועים. שמור אותו במקום בטוח.', 'Download a full JSON file with all trades, metadata and events. Keep it somewhere safe.')}</p>
                    <button className="orca-cta" onClick={exportJson} style={{ ...primaryBtn(T.accent.cyan), padding: '14px 18px', fontSize: 13 }}>
                      <Download size={14} /> {t('הורד גיבוי מלא (JSON)', 'Download full backup (JSON)')}
                    </button>
                  </div>

                  {/* ============ DANGER ZONE — wipe personal data, keep account ============ */}
                  <div style={{ ...card, border: `1px solid ${T.accent.red}55`, background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.accent.red}08 100%)` }}>
                    <h3 style={{ ...sectionTitle, color: T.accent.red }}>
                      <AlertTriangle size={14} /> {t('אזור מסוכן — מחיקת נתונים אישיים', 'Danger zone — wipe personal data')}
                    </h3>
                    <p style={sectionHint}>
                      {t(
                        'מוחק לצמיתות את כל העסקאות, היומנים, ההגדרות וחיבורי הבורסות (Bybit / Binance) השמורים בענן. חשבון המשתמש וההתחברות עם Google נשארים פעילים — תוכל להמשיך להיכנס עם אותו אימייל.',
                        'Permanently deletes every trade, journal entry, setting and exchange connection (Bybit / Binance) stored in the cloud. Your user account and Google sign-in stay intact — you can keep signing in with the same email.'
                      )}
                    </p>
                    <button
                      onClick={() => setShowWipeModal(true)}
                      style={{
                        ...primaryBtn(T.accent.red),
                        padding: '14px 18px',
                        fontSize: 13,
                        background: `linear-gradient(135deg, ${T.accent.red}, #991b1b)`,
                        color: '#fff',
                      }}
                    >
                      <Trash2 size={14} /> {t('מחק את כל הנתונים האישיים שלי', 'Delete all my personal data')}
                    </button>
                  </div>
                </div>
              );
            })()}

            {tab === 'exchanges' && (
              <ExchangesPanel T={T} isRTL={isRTL} />
            )}

            {tab === 'install' && (
              <InstallGuide T={T} t={t} isRTL={isRTL} />
            )}
          </div>
        </section>
      </div>

      {/* ============ PERSONAL DATA WIPE (keeps Google / auth account) ============ */}
      {showWipeModal && (
        <ResetModal
          T={T}
          t={t as never}
          isRTL={isRTL}
          onClose={() => setShowWipeModal(false)}
          onConfirm={async () => {
            const uid = auth.user?.id;
            if (!uid) throw new Error('not_authenticated');

            // Cloud wipe — auth.users row is intentionally NOT touched, so
            // the Google identity / email login stays fully functional.
            const results = await Promise.all([
              supabase.from('trades').delete().eq('user_id', uid),
              supabase.from('journal_state').delete().eq('user_id', uid),
              supabase.from('user_settings').delete().eq('user_id', uid),
              supabase.from('exchange_credentials').delete().eq('user_id', uid),
            ]);
            const firstErr = results.find(r => r.error)?.error;
            if (firstErr) throw new Error(firstErr.message);

            try { await scopedStorage.wipeCurrentUser(); } catch { /* ignore */ }
            try {
              window.dispatchEvent(new CustomEvent('orca:trades-synced'));
              window.dispatchEvent(new CustomEvent('orca:data-wiped'));
            } catch { /* ignore */ }

            toast.success(t('כל הנתונים האישיים נמחקו. החשבון שלך פעיל.', 'All personal data deleted. Your account is still active.'));
          }}
        />
      )}

      {/* ============ THEME COMMIT CONFIRMATION ============ */}
      {showThemeConfirm && (
        <div
          onClick={() => setShowThemeConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10010,
            background: 'rgba(2,6,15,0.78)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'orcaSettingsFade .18s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
              border: `1px solid ${draftAccent}55`,
              borderRadius: T.radius.xl,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${draftAccent}22`,
              overflow: 'hidden',
              animation: 'orcaSettingsRise .28s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{
              height: 80, position: 'relative',
              background: `linear-gradient(135deg, ${draftAccent}28, ${draftAccent}05)`,
              borderBottom: `1px solid ${T.border.subtle}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: draftAccent,
                boxShadow: `0 0 40px ${draftAccent}99, inset 0 0 20px rgba(255,255,255,0.18)`,
                border: '2px solid rgba(255,255,255,0.18)',
              }} />
            </div>
            <div style={{ padding: '22px 24px 8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text.primary, fontFamily: sans, letterSpacing: '-0.01em' }}>
                {t('לאשר את הפלטה האישית?', 'Apply this custom palette?')}
              </h3>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: T.text.secondary, lineHeight: 1.6 }}>
                {t(
                  'אורקה תיגזור פלטה מלאה מהצבע הזה ותחיל אותה על כל הממשק.',
                  'Orca will derive a full palette from this color and apply it across the UI.',
                )}
              </p>
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: `${T.accent.orange}10`,
                border: `1px solid ${T.accent.orange}35`,
                borderRadius: T.radius.md,
                fontSize: 12, color: T.accent.orange, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                🔒 {t('הבחירה תינעל ל־24 שעות', 'Locked for 24 hours after applying')}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: T.text.muted, fontFamily: mono, letterSpacing: '0.05em' }}>
                {draftAccent.toUpperCase()}
              </div>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowThemeConfirm(false)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: T.radius.md,
                  background: 'transparent', border: `1px solid ${T.border.medium}`,
                  color: T.text.secondary, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: sans,
                }}
              >
                {t('ביטול', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  setShowThemeConfirm(false);
                  ui.commitCustomAccent(draftAccent);
                  playMorningLock();
                  toast.success(t('הפלטה נשמרה ונעולה ליום', 'Palette committed and locked for 1 day'));
                }}
                style={{
                  flex: 1.4, padding: '12px 16px', borderRadius: T.radius.md,
                  background: `linear-gradient(135deg, ${draftAccent}, ${draftAccent}dd)`,
                  border: `1px solid ${draftAccent}`,
                  color: '#000', fontSize: 13, fontWeight: 800,
                  cursor: 'pointer', fontFamily: sans,
                  boxShadow: `0 6px 24px ${draftAccent}66`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Sparkles size={14} /> {t('החל ונעל', 'Apply & Lock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STUDIO COMMIT CONFIRMATION ============ */}
      {showStudioConfirm && (
        <div onClick={() => setShowStudioConfirm(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(2,6,15,0.78)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
              border: `1px solid ${draftTheme.accentPrimary}55`, borderRadius: T.radius.xl,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${draftTheme.accentPrimary}22`, overflow: 'hidden',
            }}>
            <div style={{ height: 80, background: `linear-gradient(135deg, ${draftTheme.accentPrimary}28, ${draftTheme.accentSecondary}18)`, borderBottom: `1px solid ${T.border.subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: draftTheme.accentPrimary, boxShadow: `0 0 30px ${draftTheme.accentPrimary}99` }} />
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: draftTheme.accentSecondary, boxShadow: `0 0 30px ${draftTheme.accentSecondary}99` }} />
            </div>
            <div style={{ padding: '22px 24px 8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text.primary, fontFamily: sans }}>
                {t('להחיל את ערכת הנושא המותאמת?', 'Apply this custom theme?')}
              </h3>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: T.text.secondary, lineHeight: 1.6 }}>
                {t('כל 7 הצירים יישמרו כאובייקט customTheme וייטענו אוטומטית בכל מכשיר.',
                   'All 7 axes will be saved as a customTheme object and auto-loaded across devices.')}
              </p>
              <div style={{ marginTop: 14, padding: '10px 14px', background: `${T.accent.orange}10`, border: `1px solid ${T.accent.orange}35`, borderRadius: T.radius.md, fontSize: 12, color: T.accent.orange, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                🔒 {t('הבחירה תינעל ל־24 שעות', 'Locked for 24 hours')}
              </div>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowStudioConfirm(false)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: T.radius.md, background: 'transparent', border: `1px solid ${T.border.medium}`, color: T.text.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>
                {t('ביטול', 'Cancel')}
              </button>
              <button
                onClick={() => { setShowStudioConfirm(false); ui.commitCustomTheme(draftTheme); playMorningLock(); toast.success(t('ערכה נשמרה ונעולה', 'Theme committed & locked')); }}
                style={{ flex: 1.4, padding: '12px 16px', borderRadius: T.radius.md, background: `linear-gradient(135deg, ${draftTheme.accentPrimary}, ${draftTheme.accentSecondary})`, border: `1px solid ${draftTheme.accentPrimary}`, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: sans, boxShadow: `0 6px 24px ${draftTheme.accentPrimary}66`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Sparkles size={14} /> {t('החל ונעל', 'Apply & Lock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ UNLOCK 24h DOUBLE-CONFIRM ============ */}
      {unlockStep > 0 && (
        <div onClick={() => setUnlockStep(0)}
          style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(2,6,15,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
              border: `1px solid ${T.accent.orange}55`, borderRadius: T.radius.xl,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${T.accent.orange}22`, overflow: 'hidden',
            }}>
            <div style={{ height: 76, background: `linear-gradient(135deg, ${T.accent.orange}30, transparent)`, borderBottom: `1px solid ${T.border.subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={36} color={T.accent.orange} />
            </div>
            <div style={{ padding: '22px 24px 8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text.primary, fontFamily: sans }}>
                {unlockStep === 1
                  ? t('בטל את נעילת 24 השעות?', 'Bypass the 24h lock?')
                  : t('בטוח/ה? זה ידלג על מנגנון היציבות.', 'Are you sure? This skips the stability mechanism.')}
              </h3>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: T.text.secondary, lineHeight: 1.65 }}>
                {unlockStep === 1
                  ? t('הנעילה קיימת כדי שלא תחליף ערכה אובססיבית. אישור כפול נדרש להמשך.',
                       'The lock exists so you don\'t obsessively re-tint. Double confirmation is required to continue.')
                  : t('לאחר ביטול תוכל להחיל ערכה חדשה מיד. השעון יתאפס רק לאחר Apply הבא.',
                       'After unlocking you can apply a new theme immediately. The clock will reset only after the next Apply.')}
              </p>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 10 }}>
              <button onClick={() => setUnlockStep(0)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: T.radius.md, background: 'transparent', border: `1px solid ${T.border.medium}`, color: T.text.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>
                {t('השאר נעול', 'Keep locked')}
              </button>
              <button
                onClick={() => {
                  if (unlockStep === 1) { setUnlockStep(2); return; }
                  ui.unlockTheme();
                  setUnlockStep(0);
                  toast.success(t('הנעילה בוטלה — תוכל להחיל ערכה חדשה', 'Lock bypassed — you can apply a new theme now'));
                }}
                style={{ flex: 1.4, padding: '12px 16px', borderRadius: T.radius.md, background: `linear-gradient(135deg, ${T.accent.orange}, ${T.accent.red})`, border: `1px solid ${T.accent.orange}`, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: sans, boxShadow: `0 6px 24px ${T.accent.orange}66`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {unlockStep === 1 ? <>{t('המשך', 'Continue')} →</> : <><AlertTriangle size={14} /> {t('בטל נעילה', 'Confirm unlock')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
