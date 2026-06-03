// Per-setup breakdown — mirrors getSetupBreakdown() in the legacy iframe.
// A "setup" is the user-tagged strategy name; trades without one fall under "—".

import type { Trade } from '@/data/trades';

export interface SetupStats {
  count: number;
  netR: number;
  wins: number;
  losses: number;
  winRate: number;       // 0..1
  avgR: number;
}

export function getSetupName(t: Trade): string {
  // Legacy app stored setup in comments as "Setup:NAME" or in a custom field.
  // We honor both, defaulting to "—" so untagged trades still aggregate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const direct = (t as any).setup as string | undefined;
  if (direct && direct.trim()) return direct.trim();
  const m = /Setup:([^\s,;]+)/i.exec(t.comments || '');
  return m?.[1] || '—';
}

export function getSetupBreakdown(trades: Trade[]): Record<string, SetupStats> {
  const out: Record<string, SetupStats> = {};
  for (const t of trades) {
    const k = getSetupName(t);
    if (!out[k]) out[k] = { count: 0, netR: 0, wins: 0, losses: 0, winRate: 0, avgR: 0 };
    const s = out[k];
    s.count += 1;
    s.netR += t.returnR || 0;
    if (t.winLoss === 'Win') s.wins += 1;
    else if (t.winLoss === 'Loss') s.losses += 1;
  }
  for (const k of Object.keys(out)) {
    const s = out[k];
    s.winRate = s.count ? s.wins / s.count : 0;
    s.avgR = s.count ? s.netR / s.count : 0;
  }
  return out;
}
