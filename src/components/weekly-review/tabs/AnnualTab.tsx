import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import PeriodDashboard from '../PeriodDashboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

export default function AnnualTab({ T, isRTL, trades }: Props) {
  return (
    <PeriodDashboard
      trades={trades} months={12} T={T} isRTL={isRTL}
      titleHE="שנתי" titleEN="Annual Review"
    />
  );
}
