/**
 * Advanced Analysis sub-channels.
 *
 * Shared between the sidebar navigation (Index.tsx) and the dashboard
 * renderer (ReviewDashboard.tsx) so both surfaces stay in sync.
 *
 * "Big Picture" is free; "Breakdown & Distribution" and "Quant Lab" are Pro.
 * Free users still SEE the channels (with a lock chip) — they just get the
 * upgrade card instead of the charts.
 */
export type ChannelId = 'overview' | 'breakdown' | 'quant';

export const CHANNELS: { id: ChannelId; he: string; en: string; short?: { he: string; en: string }; pro: boolean; icon: string }[] = [
  { id: 'overview',  he: 'התמונה הגדולה', en: 'Big Picture',              pro: false, icon: '◎' },
  { id: 'breakdown', he: 'פילוח וחלוקה',  en: 'Breakdown & Distribution', short: { he: 'פילוח', en: 'Breakdown' }, pro: true, icon: '◱' },
  { id: 'quant',     he: 'מעבדת קוונט',   en: 'Quant Lab',                pro: true,  icon: '∿' },
];

export const LOCKED_COPY: Record<'breakdown' | 'quant', { he: string; en: string }> = {
  breakdown: {
    he: 'פילוח לפי כיוון, חודשים ורבעונים — כולל מטריצת שנים מלאה.',
    en: 'Direction, monthly and quarterly breakdowns — including the full year matrix.',
  },
  quant: {
    he: 'חלונות הזדמנות, תשואה מול זמן החזקה וניתוח רבעוני מרובה תצוגות.',
    en: 'Opportunity windows, return vs holding time and multi-view quarterly analysis.',
  },
};
