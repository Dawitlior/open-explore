import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { TabPlaceholder } from './_placeholder';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }
export default function SetupsTab(p: Props) {
  return (
    <TabPlaceholder T={p.T} isRTL={p.isRTL}
      he={{ title: 'ניהול סטאפים', body: 'מנהל הסטאפים ופירוק NetR לפי סטאפ — בבנייה.' }}
      en={{ title: 'Setup Manager', body: 'Setup CRUD and per-setup NetR breakdown — coming next.' }} />
  );
}
