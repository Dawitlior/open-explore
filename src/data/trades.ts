export type TradeMethod = 'MSB+BOS' | 'Daily Open' | 'Breakout' | 'Pullback' | 'Reversal' | 'Scalp' | 'Swing' | 'Other';
export type ExecutionQuality = 'Clean' | 'OK' | 'Weak';
export type ExitQuality = 'Planned' | 'Early' | 'Forced';
export type PlanDeviation = 'None' | 'Minor' | 'Major';

export interface Trade {
  id: number;
  date: string;
  day: string;
  coin: string;
  direction: 'Long' | 'Short';
  orderType: string;
  entry: number;
  stopLoss: number;
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
  // Intelligence fields (Mission 6)
  method?: TradeMethod;
  executionQuality?: ExecutionQuality;
  exitQuality?: ExitQuality;
  planDeviation?: PlanDeviation;
  scaleUp?: boolean;
  intentionalRisk?: 'Planned' | 'FOMO';
}

export const RAW_TRADES: Trade[] = [];
