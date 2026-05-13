import { useState, useRef, useMemo } from 'react';
import {
  User, Palette, LayoutDashboard, Calculator, Shield, SlidersHorizontal, Database,
  X, LogOut, Mail, KeyRound, Send, Download, Eye, EyeOff, Globe, GripVertical,
  Plus, Trash2, RotateCcw, Check, AlertTriangle, Sparkles, Search,
} from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';
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
import type { Trade } from '@/data/trades';

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

type TabId = 'account' | 'appearance' | 'dashboard' | 'kpis' | 'risk' | 'interface' | 'data';

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
    { id: 'appearance', icon: Palette, label: { he: 'מראה', en: 'Appearance' }, group: { he: 'אישי', en: 'Personal' }, desc: { he: 'ערכת נושא, שפה ופרטיות', en: 'Theme, language and privacy' } },
    { id: 'dashboard', icon: LayoutDashboard, label: { he: 'סידור דאשבורד', en: 'Dashboard Layout' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'גרור, הסתר וסדר ווידג׳טים', en: 'Drag, hide and arrange widgets' } },
    { id: 'kpis', icon: Calculator, label: { he: 'מדדים מותאמים', en: 'Custom KPIs' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'בנה נוסחאות מתמטיות משלך', en: 'Build your own math formulas' } },
    { id: 'interface', icon: SlidersHorizontal, label: { he: 'ממשק וניווט', en: 'Interface & Navigation' }, group: { he: 'תצוגה', en: 'Display' }, desc: { he: 'מצבי תפעול, צפיפות ואנימציות', en: 'Operating modes, density, animations' } },
    { id: 'risk', icon: Shield, label: { he: 'מגבלות סיכון', en: 'Risk Limits' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'מערכת ה־R המותרת ביום/שבוע/חודש', en: 'Allowed R-budget per day/week/month' } },
    { id: 'data', icon: Database, label: { he: 'נתונים וגיבוי', en: 'Data & Backup' }, group: { he: 'מסחר', en: 'Trading' }, desc: { he: 'יצוא, סטטיסטיקות וניהול אחסון', en: 'Export, stats and storage management' } },
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
      `}</style>
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1180, height: '92vh', maxHeight: 880,
          background: T.bg.secondary, border: `1px solid ${T.border.medium}`,
          borderRadius: T.radius.xl, boxShadow: T.shadow.elevated,
          display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden',
          fontFamily: sans, animation: 'orcaSettingsRise .25s ease-out',
        }}
      >
        {/* SIDEBAR */}
        <aside style={{
          background: T.bg.primary, borderInlineEnd: `1px solid ${T.border.subtle}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: T.text.muted, textTransform: 'uppercase', marginBottom: 4 }}>
              ORCA OS
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.01em' }}>
              {t('הגדרות', 'Settings')}
            </div>
          </div>

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

          <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
            {groups.map(group => (
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

          {/* footer mini-account */}
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
        </aside>

        {/* CONTENT */}
        <section style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg.secondary }}>
          {/* Topbar */}
          <header style={{
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '26px 26px 40px' }}>
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
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.purple})`,
                      display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800,
                      color: T.bg.primary, flexShrink: 0,
                      boxShadow: T.shadow.glow(T.accent.cyanGlow),
                    }}>{(auth.user?.email || '?').charAt(0).toUpperCase()}</div>
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
                    <Toggle on={p.hideMarketTime} onClick={() => ui.setPrefs({ hideMarketTime: !p.hideMarketTime })} label={t('הסתר שעון שוק', 'Hide market clock')} />
                    <Toggle on={p.hideThemeSwitch} onClick={() => ui.setPrefs({ hideThemeSwitch: !p.hideThemeSwitch })} label={t('הסתר מתג Theme', 'Hide theme switch')} />
                    <Toggle on={p.hideDepthSwitch} onClick={() => ui.setPrefs({ hideDepthSwitch: !p.hideDepthSwitch })} label={t('הסתר מתג Standard/Alpha', 'Hide Standard/Alpha switch')} />
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
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </div>
  );
}
