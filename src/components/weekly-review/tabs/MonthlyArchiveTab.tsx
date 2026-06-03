import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { TabPlaceholder } from './_placeholder';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }
export default function MonthlyArchiveTab(p: Props) {
  return (
    <TabPlaceholder T={p.T} isRTL={p.isRTL}
      he={{ title: 'ארכיון חודשי', body: 'טבלת השבועות, עריכת שורות וסיכום החודש — בבנייה.' }}
      en={{ title: 'Monthly Archive', body: 'Historical weeks, inline edit, and monthly recap — coming next.' }} />
  );
}
