import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPortfoliosTool from "./tools/list-portfolios";
import listTradesTool from "./tools/list-trades";
import getTradeStatsTool from "./tools/get-trade-stats";
import listEconomicEventsTool from "./tools/list-economic-events";

// The OAuth issuer MUST be built from the Supabase project ref (import-safe,
// inlined by Vite at build time). Do not read from SUPABASE_URL — on Lovable
// Cloud that is a proxy host and mcp-js will reject tokens whose issuer does
// not match the discovery document's issuer (RFC 8414 §3.3).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "orca-mcp",
  title: "ORCA Trading Journal",
  version: "0.1.0",
  instructions:
    "Tools for the ORCA trading journal. Use `list_portfolios` and `list_trades` to inspect the signed-in trader's data, `get_trade_stats` for aggregate performance (win rate, R, expectancy, P&L), and `list_upcoming_economic_events` for the macro radar.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPortfoliosTool, listTradesTool, getTradeStatsTool, listEconomicEventsTool],
});
