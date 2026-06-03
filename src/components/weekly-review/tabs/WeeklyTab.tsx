// Placeholder for tab step 3 of the build plan.
// Renders "coming soon" intentionally — replaced when the close-week flow lands.
import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { TabPlaceholder } from './_placeholder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

export default function WeeklyTab(p: Props) {
  return (
    <TabPlaceholder
      T={p.T}
      isRTL={p.isRTL}
      he={{ title: 'סיכום שבועי', body: 'הזרימה של סגירת השבוע, המיינדסט והיומן נבנים כעת בעיצוב המקומי.' }}
      en={{ title: 'Weekly Summary', body: 'Close-week flow, mindset capture, and trade log are being rebuilt natively.' }}
    />
  );
}
