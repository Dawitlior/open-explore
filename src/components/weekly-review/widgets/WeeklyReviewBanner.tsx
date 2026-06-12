import { themeBgs } from '../lib/theme-bg';
// Top-of-page banner for the native Weekly Review.
// Three states (stackable):
//   1. Friday red-pulse reminder ("close your week")
//   2. Month-over cinematic shimmer (1st-of-month or last-day)
//   3. Auto-trade sync chip — shows how many trades from THIS week
//      were pulled automatically (so the user knows nothing is manual).
// All text bilingual + RTL-aware.

import { useEffect, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import { aggregateWeek } from '../hooks/use-week-aggregates';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Theme = any;

interface Props {
  T: Theme;
  isRTL: boolean;
  trades: Trade[];
}

function daysUntilFriday(d: Date): number {
  const dow = d.getDay(); // 0=Sun..6=Sat
  // Friday=5. If today is Fri → 0; Sat=6 → 6 days; else (5-dow)
  return dow === 5 ? 0 : (5 - dow + 7) % 7;
}

/** Window in which the user is encouraged to close the week. */
function isCloseWindow(d: Date): boolean {
  const dow = d.getDay();
  return dow === 5 || dow === 6; // Fri or Sat
}

function isLastDayOfMonth(d: Date): boolean {
  const t = new Date(d); t.setDate(t.getDate() + 1);
  return t.getDate() === 1;
}


export default function WeeklyReviewBanner({ T, isRTL, trades }: Props) {
  // Live tick to flip states across midnight without reload
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  void tick;

  const now = new Date();
  const isFri = now.getDay() === 5;
  const isSat = now.getDay() === 6;
  const inCloseWindow = isCloseWindow(now);
  const isFirstOfMonth = now.getDate() === 1;
  const isMonthEnd = isLastDayOfMonth(now);
  const showMonthOver = isFirstOfMonth || isMonthEnd;
  const dLeft = daysUntilFriday(now);


  const wk = useMemo(() => aggregateWeek(trades, now), [trades, now]);
  const tradesSynced = wk.trades.length;

  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const win = T?.status?.success || '#39FF14';
  const warn = T?.status?.warning || '#ffb830';
  const danger = T?.status?.danger || '#ff3b3b';
  const gold = '#FFD700';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        display: 'grid',
        gap: 10,
        marginBottom: 14,
        textAlign: isRTL ? 'right' : 'left',
      }}
    >
      <style>{`
        @keyframes wrbPulse { 0%,100% { box-shadow:0 0 0 0 rgba(255,77,79,0.55); } 50% { box-shadow:0 0 0 10px rgba(255,77,79,0); } }
        @keyframes wrbDot   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.45; transform:scale(0.8); } }
        @keyframes wrbShine {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes wrbFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>

      {/* ── Friday reminder ───────────────────────────────── */}
      {isFri && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: `linear-gradient(135deg, ${danger}26, ${danger}10)`,
            border: `1px solid ${danger}66`,
            borderRadius: 12,
            animation: 'wrbPulse 2.2s ease-in-out infinite',
            color: fg,
          }}
        >
          <span
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: danger, boxShadow: `0 0 10px ${danger}`,
              animation: 'wrbDot 1.4s ease-in-out infinite',
              display: 'inline-block', flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>
              {isRTL ? '📋 שישי — זמן לסקור את השבוע' : '📋 It\'s Friday — time to review the week'}
            </div>
            <div style={{ color: muted, fontSize: 11 }}>
              {isRTL
                ? 'מלא את היומן השבועי ולחץ "סגור שבוע" כדי לארכב.'
                : 'Fill the weekly journal and press "Close week" to archive.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Month-over cinematic ──────────────────────────── */}
      {showMonthOver && (
        <div
          role="status"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '14px 18px',
            background: `linear-gradient(135deg, ${gold}1f, ${accent}14)`,
            border: `1px solid ${gold}55`,
            borderRadius: 12,
            color: fg,
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(110deg, transparent 35%, ${gold}38 50%, transparent 65%)`,
              backgroundSize: '200% 100%',
              animation: 'wrbShine 3.4s linear infinite',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22, animation: 'wrbFloat 2.4s ease-in-out infinite' }}>🌙</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.4, color: gold }}>
                {isFirstOfMonth
                  ? (isRTL ? '✨ חודש חדש התחיל — סכם את הקודם' : '✨ A new month begins — close out the previous one')
                  : (isRTL ? '🏁 סוף החודש — הכן סיכום חודשי'   : '🏁 End of the month — prepare the monthly recap')}
              </div>
              <div style={{ color: muted, fontSize: 11 }}>
                {isRTL
                  ? 'עבור ל"ארכיון חודשי 📅" כדי לראות את כל השבועות ולהוסיף סיכום חודשי.'
                  : 'Open "Monthly Archive 📅" to review all weeks and write the monthly recap.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-trade sync strip (always on) ─────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: themeBgs(T).overlay,
          border: `1px solid ${border}`,
          borderRadius: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: `${win}1a`, color: win,
            border: `1px solid ${win}55`,
            borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          ⟳ {isRTL ? 'סנכרון אוטומטי' : 'AUTO-SYNC'}
        </span>
        <span style={{ color: fg, fontSize: 12, fontWeight: 600 }}>
          {tradesSynced > 0
            ? (isRTL
                ? `${tradesSynced} עסקאות מהשבוע צורפו אוטומטית — אין צורך להוסיף ידנית`
                : `${tradesSynced} trades from this week pulled automatically — nothing to add manually`)
            : (isRTL
                ? 'אין עסקאות סגורות השבוע עדיין — כל עסקה חדשה תופיע כאן אוטומטית'
                : 'No closed trades this week yet — every new trade will show here automatically')}
        </span>
        {!isFri && (
          <span
            style={{
              marginInlineStart: 'auto',
              color: muted, fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: 1, textTransform: 'uppercase',
            }}
          >
            {isRTL
              ? `${dLeft} ימים לסקירה הבאה`
              : `${dLeft}d to next review`}
            <span style={{ color: warn, marginInlineStart: 6 }}>•</span>
          </span>
        )}
      </div>
    </div>
  );
}
