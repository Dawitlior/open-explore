import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPortfolios from "./tools/list-portfolios";
import listTrades from "./tools/list-trades";
import performanceSummary from "./tools/performance-summary";
import traderMindProfile from "./tools/trader-mind-profile";
import logDayNote from "./tools/log-day-note";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "open-explore",
  title: "open-explore",
  version: "0.1.0",
  instructions:
    "Trading journal tools for ORCA Investment. Use `list_portfolios` to find a portfolio id, `list_trades` for recent trades, `performance_summary` for win rate / expectancy in R / profit factor / drawdown with per-symbol and per-weekday breakdowns, `trader_mind_profile` for the trader's behavioural diagnostic, and `log_day_note` to write a journal note. Always express edge in R-multiples, never as raw percentages, and never give financial advice.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPortfolios, listTrades, performanceSummary, traderMindProfile, logDayNote],
});
