/**
 * CSV Broker Registrations
 *
 * Each tile in `Settings → Exchanges → CSV Brokers` gets a registry entry via
 * the shared `createCsvAdapter` factory. The factory uses xlsx-engine's
 * generic header-mapping parser; per-broker signature detection comes online
 * as we add `signatureHeaders` for each one.
 *
 * Adding a new CSV broker: append to CSV_BROKER_CONFIGS below.
 */

import { createCsvAdapter, type CsvAdapterConfig } from "./_csv-factory";
import { BrokerRegistry } from "./registry";

const CSV_BROKER_CONFIGS: CsvAdapterConfig[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers",
    accent: "#dc2626",
    tagline: { he: "מניות, אופציות וחוזים", en: "Stocks, Options & Futures" },
    assetClasses: ["equities", "options", "futures"],
    signatureHeaders: ["ClientAccountID", "TradeID", "IBOrderID"],
  },
  {
    id: "ninjatrader",
    name: "NinjaTrader",
    accent: "#22c55e",
    tagline: { he: "פלטפורמת חוזים עתידיים", en: "Futures trading platform" },
    assetClasses: ["futures"],
    signatureHeaders: ["Instrument", "Strategy", "NinjaTrader"],
  },
  {
    id: "tradovate",
    name: "Tradovate",
    accent: "#3b82f6",
    tagline: { he: "חוזים עתידיים בענן", en: "Cloud-based futures" },
    assetClasses: ["futures"],
    signatureHeaders: ["Tradovate", "contractName"],
  },
  {
    id: "topstepx",
    name: "TopstepX",
    accent: "#f97316",
    tagline: { he: "חשבונות פרופ של Topstep", en: "Topstep prop accounts" },
    assetClasses: ["futures"],
    signatureHeaders: ["Topstep", "ContractName"],
  },
  {
    id: "tradelocker",
    name: "TradeLocker",
    accent: "#a855f7",
    tagline: { he: "מולטי־אסט מודרני", en: "Modern multi-asset" },
    assetClasses: ["other"],
  },
  {
    id: "mt5",
    name: "MetaTrader 5",
    accent: "#0ea5e9",
    tagline: { he: "הסטנדרט החדש של פורקס", en: "Modern FX standard" },
    assetClasses: ["fx", "futures"],
    signatureHeaders: ["Deal", "Position", "MetaTrader 5"],
  },
  {
    id: "mt4",
    name: "MetaTrader 4",
    accent: "#06b6d4",
    tagline: { he: "קלאסיקה של פורקס", en: "Classic FX terminal" },
    assetClasses: ["fx"],
    signatureHeaders: ["Ticket", "MetaTrader 4"],
  },
  {
    id: "sierra",
    name: "Sierra Chart",
    accent: "#eab308",
    tagline: { he: "גרפים מקצועיים DOM", en: "Professional DOM charting" },
    assetClasses: ["futures"],
  },
  {
    id: "colmexpro",
    name: "ColmexPro",
    accent: "#ef4444",
    tagline: { he: "מניות אמריקאיות לטרייד יום", en: "US equities day-trading" },
    assetClasses: ["equities"],
  },
];

for (const cfg of CSV_BROKER_CONFIGS) {
  BrokerRegistry._register(createCsvAdapter(cfg));
}
