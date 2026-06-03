import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { TabPlaceholder } from './_placeholder';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }
export default function AnnualTab(p: Props) {
  return (
    <TabPlaceholder T={p.T} isRTL={p.isRTL}
      he={{ title: 'שנתי', body: 'אותם מודולים על חלון 12 חודשים — בבנייה.' }}
      en={{ title: 'Annual', body: 'Same modules over a 12-month window — coming next.' }} />
  );
}
