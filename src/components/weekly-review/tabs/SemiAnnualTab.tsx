import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { TabPlaceholder } from './_placeholder';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }
export default function SemiAnnualTab(p: Props) {
  return (
    <TabPlaceholder T={p.T} isRTL={p.isRTL}
      he={{ title: 'חצי-שנתי', body: '18 מודולי אנליטיקה (Equity, DNA Radar, Waterfall, PF Trend…) — בבנייה בעיצוב המקומי.' }}
      en={{ title: 'Semi-Annual', body: '18 analytics modules (Equity, DNA Radar, Waterfall, PF Trend, …) being rebuilt natively.' }} />
  );
}
