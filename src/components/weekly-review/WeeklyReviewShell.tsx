// Native Weekly Review shell — replaces the iframe wrapper.
// Renders a 5-tab segmented control mapped to the legacy app's TABS array:
//   0 סיכום שבועי ⚡   1 ניהול סטאפים ⚙️   2 ארכיון חודשי 📅   3 חצי-שנתי 📊   4 שנתי 🗓️

import { lazy, Suspense, useState } from 'react';
import type { Trade } from '@/data/trades';
import { useWeeklyReviewState } from './hooks/use-weekly-review-state';
import WeeklyReviewBanner from './widgets/WeeklyReviewBanner';

const WeeklyTab        = lazy(() => import('./tabs/WeeklyTab'));
const SetupsTab        = lazy(() => import('./tabs/SetupsTab'));
const MonthlyArchiveTab= lazy(() => import('./tabs/MonthlyArchiveTab'));
const SemiAnnualTab    = lazy(() => import('./tabs/SemiAnnualTab'));
const AnnualTab        = lazy(() => import('./tabs/AnnualTab'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrcaTheme = any;

interface Props {
  T: OrcaTheme;
  isRTL: boolean;
  trades: Trade[];
}

const TABS_HE = ['סיכום שבועי ⚡', 'ניהול סטאפים ⚙️', 'ארכיון חודשי 📅', 'חצי-שנתי 📊', 'שנתי 🗓️'];
const TABS_EN = ['Weekly Summary ⚡', 'Setups ⚙️', 'Monthly Archive 📅', 'Semi-Annual 📊', 'Annual 🗓️'];

export const WeeklyReviewShell = ({ T, isRTL, trades }: Props) => {
  const [tab, setTab] = useState(0);
  const state = useWeeklyReviewState();
  const labels = isRTL ? TABS_HE : TABS_EN;

  const bg = T?.bg?.primary || '#061326';
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';

  const shared = { T, isRTL, trades, state };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        minHeight: 'calc(100dvh - 60px)',
        background: bg,
        color: fg,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingInline: 'clamp(12px, 3vw, 24px)',
        fontFamily: "'Poppins', system-ui, sans-serif",
        boxSizing: 'border-box',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
      }}
    >
      {/* ── Reminder + month-over + auto-trade sync banner ── */}
      <div style={{ marginTop: 12 }}>
        <WeeklyReviewBanner T={T} isRTL={isRTL} trades={trades} />
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Weekly Review"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 6,
          margin: '12px 0 16px',
          background: panel,
          border: `1px solid ${border}`,
          borderRadius: 14,
          backdropFilter: 'blur(6px)',
        }}
      >
        {labels.map((label, i) => {
          const active = tab === i;
          return (
            <button
              key={label}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(i)}
              style={{
                flex: '1 1 140px',
                padding: '10px 12px',
                minHeight: 44,
                background: active ? `linear-gradient(135deg, ${accent}22, ${accent}10)` : 'transparent',
                color: active ? fg : muted,
                border: `1px solid ${active ? accent + '66' : 'transparent'}`,
                borderRadius: 10,
                fontFamily: 'inherit',
                fontWeight: active ? 700 : 500,
                fontSize: 'clamp(11px, 1.4vw, 13px)',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 180ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Suspense fallback={<TabSkeleton muted={muted} isRTL={isRTL} />}>
        {tab === 0 && <WeeklyTab {...shared} />}
        {tab === 1 && <SetupsTab {...shared} />}
        {tab === 2 && <MonthlyArchiveTab {...shared} />}
        {tab === 3 && <SemiAnnualTab {...shared} />}
        {tab === 4 && <AnnualTab {...shared} />}
      </Suspense>
    </div>
  );
};

const TabSkeleton = ({ muted, isRTL }: { muted: string; isRTL: boolean }) => (
  <div style={{ padding: 32, color: muted, fontSize: 12, letterSpacing: 2 }}>
    {isRTL ? 'טוען…' : 'Loading…'}
  </div>
);

export default WeeklyReviewShell;
