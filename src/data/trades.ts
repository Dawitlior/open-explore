export interface Trade {
  id: number;
  date: string;
  day: string;
  coin: string;
  direction: 'Long' | 'Short';
  orderType: string;
  entry: number;
  /** `null` = trade was imported without a stop-loss (e.g. CSV from a broker).
   *  Dashboards in R-Multiple mode hide rows where stopLoss is null. */
  stopLoss: number | null;
  exit: number;
  returnR: number;
  winLoss: 'Win' | 'Loss' | 'Break Even';
  risk: number;
  expectedLoss: number;
  pnl: number;
  deviation: number;
  positionSize: number;
  leverage: number;
  balance: number;
  riskPct: number;
  rules: boolean;
  comments: string;
  /** Tier-1 user override mirrored from the DB column `manual_r_multiple`. */
  manual_r_multiple?: number | null;
  manualR?: number | null;
}

export const RAW_TRADES: Trade[] = [];
