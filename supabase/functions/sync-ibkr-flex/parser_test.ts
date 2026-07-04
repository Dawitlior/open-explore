// Regression fixture: FlexQueryResponse with OpenPositions and an empty
// <Trades> element (positions-only report). This shape MUST parse cleanly as
// kind:'report' with zero closed trades and one open position — never as
// 'unexpected_envelope' or any error.

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  parseFlexXml,
  reconstructClosedTrades,
  mapOpenPositions,
} from '../_shared/brokers/ibkr-flex.ts';

const POSITIONS_ONLY_XML = `<FlexQueryResponse queryName="ORCA" type="AF">
 <FlexStatements count="1">
  <FlexStatement accountId="U23731232" fromDate="20260604" toDate="20260703"
    period="Last30CalendarDays" whenGenerated="20260704;045054">
   <OpenPositions>
    <OpenPosition assetCategory="STK" symbol="MSTR" conid="272110"
      isin="US5949724083" multiplier="1" position="5.7257" markPrice="100.77"
      costBasisPrice="141.802804897" fifoPnlUnrealized="-234.94032" side="Long"
      reportDate="20260703"/>
   </OpenPositions>
   <Trades> </Trades>
  </FlexStatement>
 </FlexStatements>
</FlexQueryResponse>`;

Deno.test('parses positions-only report with whitespace-only <Trades> as success', () => {
  const parsed = parseFlexXml(POSITIONS_ONLY_XML);
  assertEquals(parsed.kind, 'report');
  if (parsed.kind !== 'report') return;
  assertEquals(parsed.statements.length, 1);
  const s = parsed.statements[0];
  assertEquals(s.accountId, 'U23731232');
  assertEquals(s.trades.length, 0);
  assertEquals(s.openPositions.length, 1);

  const recon = reconstructClosedTrades(s.trades);
  assertEquals(recon.closedTrades.length, 0);
  assertEquals(recon.warnings.length, 0);

  const open = mapOpenPositions(s.openPositions, 'IBKR Live');
  assertEquals(open.length, 1);
  assertEquals(open[0].symbol, 'MSTR');
  assertEquals(open[0].side, 'Long');
  assertEquals(Math.round(open[0].size * 10000), 57257);
});

Deno.test('empty FlexStatements array still yields kind:report with zero statements', () => {
  const xml = `<FlexQueryResponse queryName="ORCA" type="AF"><FlexStatements count="0"></FlexStatements></FlexQueryResponse>`;
  const parsed = parseFlexXml(xml);
  assertEquals(parsed.kind, 'report');
});
