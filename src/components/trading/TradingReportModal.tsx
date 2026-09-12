/**
 * TradingReportModal — export a broker-grade "Trading Report" (MT5-style
 * account statement) for the active portfolio: deals, positions, summary,
 * details + balance/monthly charts, ORCA branding and seal.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import { infoColor } from '@/lib/semantic-color';
import { buildTradingReportHtml, loadLogoDataUrl, type ReportPosition } from '@/lib/report/trading-report';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';

type RangeId = 'all' | 'ytd' | 'd90' | 'd30';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  onClose: () => void;
}

const RANGES: Array<{ id: RangeId; he: string; en: string }> = [
  { id: 'all', he: 'כל ההיסטוריה', en: 'All history' },
  { id: 'ytd', he: 'מתחילת השנה', en: 'Year to date' },
  { id: 'd90', he: '90 ימים אחרונים', en: 'Last 90 days' },
  { id: 'd30', he: '30 ימים אחרונים', en: 'Last 30 days' },
];

function sinceFor(range: RangeId): Date | null {
  const now = new Date();
  if (range === 'all') return null;
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const d = new Date(now);
  d.setDate(d.getDate() - (range === 'd90' ? 90 : 30));
  return d;
}

export function TradingReportModal({ T, isRTL, trades, onClose }: Props) {
  const { user } = useAuth();
  const { activePortfolio } = useActivePortfolio();
  const [range, setRange] = useState<RangeId>('all');
  const [withPositions, setWithPositions] = useState(true);
  const [busy, setBusy] = useState(false);

  const scoped = useMemo(() => {
    const since = sinceFor(range);
    if (!since) return trades;
    const iso = since.toISOString().slice(0, 10);
    return trades.filter(t => String(t.date || '').slice(0, 10) >= iso);
  }, [trades, range]);

  const generate = async (mode: 'open' | 'download') => {
    if (!scoped.length) {
      toast.error(isRTL ? 'אין עסקאות בטווח שנבחר' : 'No trades in the selected range');
      return;
    }
    setBusy(true);
    try {
      let positions: ReportPosition[] = [];
      if (withPositions && user?.id) {
        const { data } = await supabase
          .from('open_positions')
          .select('symbol, side, size, entry_price, unrealized_pnl, stop_loss, leverage, account_label')
          .eq('user_id', user.id);
        positions = (data ?? []) as ReportPosition[];
      }

      const logoDataUrl = await loadLogoDataUrl();
      const html = buildTradingReportHtml(scoped, {
        brand: 'ORCA Investment',
        accountName: activePortfolio?.name ?? 'Primary Portfolio',
        accountId: (activePortfolio?.id ?? '—').slice(0, 8).toUpperCase(),
        ownerName: (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? 'Trader',
        currency: activePortfolio?.currency ?? 'USD',
        initialDeposit: Number(activePortfolio?.starting_balance ?? 0),
        isRTL,
        logoDataUrl,
        positions,
      });

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      if (mode === 'open') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `ORCA-Trading-Report-${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(isRTL ? 'הדוח נוצר' : 'Report generated');
      onClose();
    } catch (e) {
      console.error('[trading-report]', e);
      toast.error(isRTL ? 'יצירת הדוח נכשלה' : 'Could not generate the report');
    } finally {
      setBusy(false);
    }
  };

  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 14px', borderRadius: T.radius.md, fontSize: 12, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
    border: primary ? 'none' : `1px solid ${T.border.medium}`,
    background: primary ? infoColor(T) : 'transparent',
    color: primary ? T.bg.primary : T.text.secondary,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, display: 'grid', placeItems: 'center',
        background: 'rgba(3,7,14,0.72)', backdropFilter: 'blur(6px)', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', background: T.bg.card, borderRadius: 18,
          border: `1px solid ${T.border.medium}`, padding: 22,
          boxShadow: '0 40px 110px -30px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ height: 3, width: 54, borderRadius: 3, background: T.accent.orange, marginBottom: 14 }} />
        <h2 style={{ margin: 0, fontSize: 16, color: T.text.primary, fontWeight: 800 }}>
          {isRTL ? 'דוח מסחר' : 'Trading Report'}
        </h2>
        <p style={{ margin: '6px 0 18px', fontSize: 11.5, color: T.text.muted, lineHeight: 1.6 }}>
          {isRTL
            ? 'דוח חשבון מלא בסגנון ברוקר: עסקאות, פוזיציות, סיכום, פירוט וגרפים — עם חותמת ORCA.'
            : 'A broker-grade account statement: deals, positions, summary, details and charts — sealed with the ORCA stamp.'}
        </p>

        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text.muted, marginBottom: 8 }}>
          {isRTL ? 'טווח' : 'Range'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {RANGES.map(r => {
            const on = range === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className="orca-focus"
                style={{
                  padding: '9px 10px', borderRadius: T.radius.sm, fontSize: 11.5, cursor: 'pointer',
                  border: `1px solid ${on ? infoColor(T) : T.border.medium}`,
                  background: on ? `${infoColor(T)}18` : 'transparent',
                  color: on ? infoColor(T) : T.text.secondary, fontWeight: on ? 700 : 500,
                }}
              >{isRTL ? r.he : r.en}</button>
            );
          })}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.text.secondary, cursor: 'pointer', marginBottom: 18 }}>
          <input type="checkbox" checked={withPositions} onChange={e => setWithPositions(e.target.checked)} />
          {isRTL ? 'כלול פוזיציות פתוחות' : 'Include open positions'}
        </label>

        <div style={{ fontSize: 10.5, color: T.text.muted, marginBottom: 14 }}>
          {isRTL ? `${scoped.length} עסקאות בדוח` : `${scoped.length} deals in this report`}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy} onClick={() => generate('open')} style={btn(true)} className="orca-focus">
            {isRTL ? 'צור ופתח' : 'Generate & open'}
          </button>
          <button disabled={busy} onClick={() => generate('download')} style={btn(false)} className="orca-focus">
            {isRTL ? 'הורדה' : 'Download'}
          </button>
          <button disabled={busy} onClick={onClose} style={{ ...btn(false), flex: 0, padding: '10px 12px' }} className="orca-focus">
            {isRTL ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradingReportModal;
