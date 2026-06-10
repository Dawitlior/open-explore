// Native Weekly Review shell — replaces the iframe wrapper.
// Renders a 5-tab segmented control mapped to the legacy app's TABS array:
//   0 סיכום שבועי ⚡   1 ניהול סטאפים ⚙️   2 ארכיון חודשי 📅   3 חצי-שנתי 📊   4 שנתי 🗓️

import { lazy, Suspense, useState } from 'react';
import type { Trade } from '@/data/trades';
import { useWeeklyReviewState } from './hooks/use-weekly-review-state';
import WeeklyReviewBanner from './widgets/WeeklyReviewBanner';
import { ReviewUnitProvider, useReviewUnit } from './hooks/use-review-unit';

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

export const WeeklyReviewShell = (props: Props) => (
  <ReviewUnitProvider>
    <WeeklyReviewShellInner {...props} />
  </ReviewUnitProvider>
);

const WeeklyReviewShellInner = ({ T, isRTL, trades }: Props) => {
  const [tab, setTab] = useState(0);
  const state = useWeeklyReviewState();
  const labels = isRTL ? TABS_HE : TABS_EN;
  const { unit, setUnit } = useReviewUnit();

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
      data-weekly-review
      style={{
        width: '100%',
        maxWidth: '100vw',
        minHeight: 'calc(100dvh - 60px)',
        background: bg,
        color: fg,
        paddingTop: 'env(safe-area-inset-top)',
        // Reserve room for the mobile bottom-nav (~60px + safe-area).
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)',
        paddingInline: 'clamp(15px, 3vw, 24px)',
        fontFamily: "'Poppins', system-ui, sans-serif",
        boxSizing: 'border-box',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
        overflowX: 'hidden',
      }}
    >
      {/* ── Mobile-first responsive overrides for inline-styled grids ── */}
      <style>{`
        [data-weekly-review],
        [data-weekly-review] * {
          box-sizing: border-box;
          min-width: 0;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        [data-weekly-review] img,
        [data-weekly-review] svg,
        [data-weekly-review] canvas,
        [data-weekly-review] .recharts-wrapper,
        [data-weekly-review] .recharts-surface,
        [data-weekly-review] .recharts-responsive-container {
          max-width: 100% !important;
        }
        [data-weekly-review] table {
          max-width: 100%;
          table-layout: fixed;
          overflow-wrap: break-word;
        }
        @media (max-width: 640px) {
          [data-weekly-review] {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            padding-inline: 15px !important;
          }
          [data-weekly-review] h1 { font-size: 18px !important; }
          [data-weekly-review] section {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            padding: 15px !important;
          }
          [data-weekly-review] [role="tablist"] button {
            flex: 1 1 calc(50% - 6px) !important;
            font-size: 11px !important;
            padding: 9px 8px !important;
            min-height: 40px !important;
          }
          /* Collapse every multi-column grid to a single column on mobile */
          [data-weekly-review] section > div[style*="grid-template-columns"],
          [data-weekly-review] section div[style*="grid-template-columns: repeat(auto-fit"],
          [data-weekly-review] section div[style*="grid-template-columns: repeat(3"],
          [data-weekly-review] section div[style*="grid-template-columns: repeat(4"],
          [data-weekly-review] div[style*="minmax(320px"],
          [data-weekly-review] div[style*="minmax(240px"],
          [data-weekly-review] div[style*="minmax(220px"],
          [data-weekly-review] div[style*="minmax(180px"],
          [data-weekly-review] div[style*="minmax(160px"] {
            grid-template-columns: 1fr !important;
          }
          /* 2-up stat grids keep 2 columns to stay info-dense */
          [data-weekly-review] section div[style*="minmax(140px"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          [data-weekly-review] div[style*="overflow-x: auto"] {
            overflow-x: hidden !important;
            max-width: 100% !important;
          }
          [data-weekly-review] table,
          [data-weekly-review] thead,
          [data-weekly-review] tbody,
          [data-weekly-review] tr,
          [data-weekly-review] th,
          [data-weekly-review] td {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            white-space: normal !important;
            text-align: inherit !important;
          }
          [data-weekly-review] thead { display: none !important; }
          [data-weekly-review] tbody { display: grid !important; gap: 8px !important; }
          [data-weekly-review] tr {
            border: 1px solid ${border} !important;
            border-radius: 10px !important;
            padding: 6px !important;
            background: ${panel} !important;
          }
          [data-weekly-review] table { font-size: 11px !important; border-collapse: separate !important; }
          [data-weekly-review] table th, [data-weekly-review] table td { padding: 6px 4px !important; }
          [data-weekly-review] [style*="min-width: 480px"] {
            min-width: 0 !important;
            grid-template-columns: 30px repeat(24, minmax(6px, 1fr)) !important;
            gap: 1px !important;
            font-size: 8px !important;
          }
          [data-weekly-review] [style*="min-width: 200px"],
          [data-weekly-review] [style*="flex: 1 1 320px"] {
            min-width: 0 !important;
            flex-basis: 100% !important;
          }
          [data-weekly-review] textarea,
          [data-weekly-review] input,
          [data-weekly-review] select {
            font-size: 16px !important; /* prevents iOS zoom-on-focus */
          }
          [data-weekly-review] button { min-height: 44px; }
        }
      `}</style>
      {/* ── Reminder + month-over + auto-trade sync banner ── */}
      <div style={{ marginTop: 12 }}>
        <WeeklyReviewBanner T={T} isRTL={isRTL} trades={trades} />
      </div>

      {/* ── Unit toggle (R | $) ── */}
      <div style={{
        display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end',
        margin: '8px 0 12px',
      }}>
        <div role="radiogroup" aria-label="Display unit" style={{
          display: 'inline-flex', padding: 4, background: panel,
          border: `1px solid ${border}`, borderRadius: 999,
        }}>
          {(['R', 'USD'] as const).map(u => {
            const active = unit === u;
            const label = u === 'USD' ? '$' : 'R';
            return (
              <button
                key={u}
                role="radio"
                aria-checked={active}
                onClick={() => setUnit(u)}
                style={{
                  all: 'unset', cursor: 'pointer',
                  minWidth: 44, minHeight: 32, padding: '4px 14px',
                  borderRadius: 999, textAlign: 'center',
                  background: active ? `${accent}22` : 'transparent',
                  border: `1px solid ${active ? accent + '88' : 'transparent'}`,
                  color: active ? accent : muted,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 800, fontSize: 13, letterSpacing: 1,
                  transition: 'all 180ms ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
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
          margin: '0 0 16px',
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
