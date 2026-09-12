/**
 * Dashboard sub-channels.
 *
 * Shared between the sidebar navigation (Index.tsx) and the dashboard
 * renderer (ReviewDashboard.tsx) so both surfaces stay in sync.
 *
 * `home` is the Dashboard entry itself (the sidebar row) — it is NOT listed
 * as a sub-item. Only the three analysis channels below are sub-items.
 *
 * Channel names follow the charts they actually contain.
 */
export type ChannelId = 'home' | 'overview' | 'breakdown' | 'quant';

export interface ChannelDef {
  id: ChannelId;
  he: string;
  en: string;
  short?: { he: string; en: string };
  pro: boolean;
  icon: string;
}

export const HOME_CHANNEL: ChannelDef = {
  id: 'home', he: 'דשבורד', en: 'Dashboard', pro: false, icon: '▦',
};

/** Sub-channels shown under the Dashboard row. */
export const CHANNELS: ChannelDef[] = [
  {
    id: 'overview',
    he: 'עקומת הון ויתרון',
    en: 'Equity & Edge',
    short: { he: 'הון ויתרון', en: 'Equity & Edge' },
    pro: false,
    icon: '◎',
  },
  {
    id: 'breakdown',
    he: 'עונתיות וכיוון',
    en: 'Seasonality & Direction',
    short: { he: 'עונתיות', en: 'Seasonality' },
    pro: false,
    icon: '◱',
  },
  {
    id: 'quant',
    he: 'תזמון וקצב',
    en: 'Timing & Rhythm',
    short: { he: 'תזמון', en: 'Timing' },
    pro: true,
    icon: '∿',
  },
];

/** Home + sub-channels — used by the dashboard's own inline tab row. */
export const ALL_CHANNELS: ChannelDef[] = [HOME_CHANNEL, ...CHANNELS];

export const LOCKED_COPY: Record<'breakdown' | 'quant', { he: string; en: string }> = {
  breakdown: {
    he: 'פילוח לפי כיוון, חודשים ורבעונים — כולל מטריצת שנים מלאה.',
    en: 'Direction, monthly and quarterly breakdowns — including the full year matrix.',
  },
  quant: {
    he: 'חלונות הזדמנות לפי יום ושעה, תשואה מול זמן החזקה וניתוח רבעוני מרובה תצוגות.',
    en: 'Day & hour opportunity windows, return vs holding time and multi-view quarterly analysis.',
  },
};

/* ─────────────── Performance page sub-channels ─────────────── */

export type PerfChannelId = 'core' | 'risk' | 'dynamics' | 'temporal' | 'lab';

export interface PerfChannelDef {
  id: PerfChannelId;
  he: string;
  en: string;
  icon: string;
  /** Pro-only channel — visible but blurred behind an upgrade card. */
  pro?: boolean;
}

/**
 * Sub-channels shown under the Performance row in the sidebar.
 * Clicking the Performance row itself shows the main deck (KPIs → Risk-Adjusted);
 * these sub-channels hold the deep-dive labs.
 */
export const PERF_CHANNELS: PerfChannelDef[] = [
  { id: 'core', he: 'ליבה', en: 'Core', icon: '◎' },
  { id: 'risk', he: 'סיכון', en: 'Risk', icon: '⚠' },
  { id: 'dynamics', he: 'דינמיקה', en: 'Dynamics', icon: '∿', pro: true },
  { id: 'temporal', he: 'תזמון', en: 'Timing', icon: '◷', pro: true },
  { id: 'lab', he: 'מעבדה', en: 'Lab', icon: '⌬', pro: true },
];

/* ─────────────── Control Room sub-channels ─────────────── */

export type CrChannelId = 'risk' | 'mind';

export const CR_CHANNELS: Array<{ id: CrChannelId; he: string; en: string; icon: string }> = [
  { id: 'risk', he: 'סיכון', en: 'Risk', icon: '🛡' },
  { id: 'mind', he: 'תודעה', en: 'Mind', icon: '🧠' },
];

/* ─────────────── Intelligence / AI sub-channels ─────────────── */

export type AiChannelId = 'insights' | 'coach';

export const AI_CHANNELS: Array<{ id: AiChannelId; he: string; en: string; icon: string; pro?: boolean }> = [
  { id: 'insights', he: 'תובנות AI', en: 'AI Insights', icon: '✦', pro: true },
  { id: 'coach', he: 'Orca Coach', en: 'Orca Coach', icon: '◈', pro: true },
];
