import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import YearlyDashboard from '../YearlyDashboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

export default function AnnualTab({ T, isRTL, trades }: Props) {
  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 32 }}>
      <div>
        <div style={{ color: T?.accent?.cyan || '#00f2ff', fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>ANNUAL · 12M</div>
        <h2 style={{ margin: '4px 0 0', color: T?.text?.primary || '#e9eef7', fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 700 }}>
          {isRTL ? 'שנתי' : 'Annual Review'}
        </h2>
      </div>
      <YearlyDashboard T={T} isRTL={isRTL} trades={trades}/>
    </div>
  );
}
