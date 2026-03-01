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
}

export const RAW_TRADES: Trade[] = [
  { id:1, date:'2026-02-04T19:00', day:'Wed', coin:'SUI', direction:'Short', orderType:'Market', entry:1.0743, stopLoss:1.1389, exit:0.9131, returnR:2.4062, winLoss:'Win', risk:2, expectedLoss:1.95, pnl:4.8124, deviation:0, positionSize:10, leverage:3, balance:204, riskPct:1, rules:true, comments:'' },
  { id:2, date:'2026-02-07T06:00', day:'Sat', coin:'ATOM', direction:'Long', orderType:'Market', entry:2.0107, stopLoss:1.9844, exit:1.9842, returnR:-1.0618, winLoss:'Loss', risk:2, expectedLoss:1.95, pnl:-2.1236, deviation:0.0618, positionSize:74, leverage:25, balance:201.81, riskPct:1, rules:true, comments:'' },
  { id:3, date:'2026-02-10T15:00', day:'Tue', coin:'ALGO', direction:'Short', orderType:'Market', entry:0.09291, stopLoss:0.09386, exit:0.09388, returnR:-1.0811, winLoss:'Loss', risk:2, expectedLoss:1.95, pnl:-2.1622, deviation:0.0811, positionSize:2030, leverage:15, balance:199.65, riskPct:1, rules:true, comments:'' },
  { id:4, date:'2026-02-14T04:00', day:'Sat', coin:'XLM', direction:'Long', orderType:'Market', entry:0.16611, stopLoss:0.16443, exit:0.17056, returnR:2.3425, winLoss:'Win', risk:2, expectedLoss:1.95, pnl:4.685, deviation:0, positionSize:1100, leverage:10, balance:204.23, riskPct:1, rules:true, comments:'' },
  { id:5, date:'2026-02-14T18:00', day:'Sat', coin:'ADA', direction:'Long', orderType:'Market', entry:0.2882, stopLoss:0.285, exit:0.296, returnR:2.2436, winLoss:'Win', risk:2, expectedLoss:1.95, pnl:4.4872, deviation:0, positionSize:600, leverage:25, balance:208.82, riskPct:1, rules:true, comments:'' },
  { id:6, date:'2026-02-16T05:00', day:'Mon', coin:'SUI', direction:'Short', orderType:'Market', entry:0.9626, stopLoss:0.9752, exit:0.9752, returnR:-1.0249, winLoss:'Loss', risk:2, expectedLoss:1.95, pnl:-2.0498, deviation:0.0249, positionSize:150, leverage:15, balance:206.32, riskPct:1, rules:true, comments:'' },
  { id:7, date:'2026-02-15T11:00', day:'Sun', coin:'OP', direction:'Short', orderType:'Market', entry:0.19418, stopLoss:0.19746, exit:0.18448, returnR:2.7431, winLoss:'Win', risk:2, expectedLoss:1.95, pnl:5.4862, deviation:0, positionSize:580, leverage:15, balance:211.98, riskPct:1, rules:true, comments:'' },
  { id:8, date:'2026-02-17T00:00', day:'Tue', coin:'ATOM', direction:'Long', orderType:'Market', entry:2.2783, stopLoss:2.2233, exit:2.2231, returnR:-0.9947, winLoss:'Loss', risk:2, expectedLoss:1.95, pnl:-1.9894, deviation:0.0053, positionSize:35, leverage:25, balance:209.9, riskPct:1, rules:true, comments:'' },
  { id:9, date:'2026-02-18T03:00', day:'Wed', coin:'ALGO', direction:'Short', orderType:'Market', entry:0.09256, stopLoss:0.09325, exit:0.09326, returnR:-1.179525, winLoss:'Loss', risk:4, expectedLoss:3.9, pnl:-4.7181, deviation:0.179525, positionSize:5900, leverage:15, balance:205, riskPct:1, rules:true, comments:'' },
  { id:10, date:'2026-02-18T15:00', day:'Wed', coin:'OP', direction:'Short', orderType:'Market', entry:0.18404, stopLoss:0.18836, exit:0.18839, returnR:-1.0266, winLoss:'Loss', risk:4, expectedLoss:3.9, pnl:-4.1064, deviation:0.0266, positionSize:900, leverage:15, balance:201, riskPct:1, rules:true, comments:'' },
  { id:11, date:'2026-02-18T20:00', day:'Wed', coin:'ONDO', direction:'Short', orderType:'Market', entry:0.2674, stopLoss:0.2736, exit:0.2669, returnR:0.041925, winLoss:'Break Even', risk:4, expectedLoss:3.9, pnl:0.1677, deviation:0, positionSize:585, leverage:10, balance:201.1677, riskPct:1, rules:true, comments:'' },
  { id:12, date:'2026-02-21T16:00', day:'Sat', coin:'IMX', direction:'Long', orderType:'Market', entry:0.17125, stopLoss:0.16926, exit:0.16921, returnR:-1.10445, winLoss:'Loss', risk:4, expectedLoss:3.9, pnl:-4.4178, deviation:0.10445, positionSize:1980, leverage:15, balance:196.7499, riskPct:1, rules:true, comments:'' },
  { id:13, date:'2026-02-23T16:00', day:'Mon', coin:'ATOM', direction:'Short', orderType:'Market', entry:2.167, stopLoss:2.238, exit:1.9886, returnR:2.40525, winLoss:'Win', risk:4, expectedLoss:3.9, pnl:9.621, deviation:0, positionSize:54.5, leverage:10, balance:206.3709, riskPct:1, rules:true, comments:'' },
  { id:14, date:'2026-02-25T14:00', day:'Wed', coin:'ATOM', direction:'Long', orderType:'Market', entry:2.0788, stopLoss:2.0534, exit:2.0454, returnR:-1.39305, winLoss:'Loss', risk:4, expectedLoss:3.9, pnl:-5.5722, deviation:0.39305, positionSize:155, leverage:10, balance:200.7987, riskPct:1, rules:true, comments:'טרייד לא טוב, צריך לשלוט בסטייה שלי יותר, להוריד מינוף' },
  { id:15, date:'2026-02-27T19:00', day:'Fri', coin:'POL', direction:'Short', orderType:'Market', entry:0.10753, stopLoss:0.10972, exit:0.10205, returnR:2.548, winLoss:'Win', risk:4, expectedLoss:3.9, pnl:8.5542, deviation:0, positionSize:1800, leverage:10, balance:209.3529, riskPct:1, rules:true, comments:'' },
  { id:16, date:'2026-02-28T11:00', day:'Sat', coin:'XLM', direction:'Short', orderType:'Market', entry:0.14892, stopLoss:0.15109, exit:0.15114, returnR:-1.0276, winLoss:'Loss', risk:4, expectedLoss:3.9, pnl:-4.0472, deviation:0.0276, positionSize:2000, leverage:15, balance:205.3057, riskPct:1, rules:true, comments:'' },
];
