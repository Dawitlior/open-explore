/**
 * Broker-Agnostic Adapter Contract
 * ---------------------------------------------------------------
 * Every data source (API exchange, CSV broker, manual entry) implements
 * this interface. The Dispatcher (src/lib/ingestion/dispatch.ts) speaks
 * only to this contract — it never knows whether bytes came from a Bybit
 * REST call, an IBKR Flex Report XML, or a hand-typed trade.
 *
 * Adapters live in src/lib/brokers/<id>.ts (one file per broker).
 * Edge-function mirrors live in supabase/functions/_shared/brokers/.
 */

export type BrokerKind = "api" | "file" | "hybrid";
export type SourceType = "api_sync" | "csv_import" | "manual";
export type AssetClass =
  | "crypto"
  | "fx"
  | "equities"
  | "futures"
  | "options"
  | "other";

export interface BrokerMeta {
  /** Stable machine id — never rename. Used as the DB column value. */
  id: string;
  /** Human-readable display name. */
  name: string;
  kind: BrokerKind;
  assetClasses: AssetClass[];
  /** Brand accent (HSL token name or hex). UI only. */
  accent: string;
  tagline: { he: string; en: string };
}

export type RawFill = Record<string, unknown>;

/** Canonical, broker-agnostic trade shape persisted to public.trades. */
export interface NormalizedTrade {
  external_id: string;
  broker_id: string;
  account_label: string | null;
  source_type: SourceType;
  asset_class: AssetClass;
  symbol: string;
  direction: "Long" | "Short";
  entry: number;
  exit: number;
  stop_loss: number | null;
  size: number;
  leverage: number;
  pnl: number;
  fees: number;
  opened_at: string; // ISO 8601
  closed_at: string; // ISO 8601
  /** Verbatim source payload — kept for forensic replay & re-normalization. */
  raw: RawFill;
}

export interface DetectResult {
  matches: boolean;
  /** 0 = no, 1 = weak, 2 = good, 3 = signature columns present. */
  confidence: 0 | 1 | 2 | 3;
  reason?: string;
}

export interface FileAdapterInput {
  file: File;
  parsedRows?: unknown[];
  headers?: string[];
}

export interface ApiAdapterInput {
  apiKey: string;
  apiSecret: string;
  mode: "bulk" | "incremental";
  since?: number;
  symbol?: string;
  accountLabel?: string | null;
}

export interface OpenPosition {
  broker_id: string;
  account_label: string | null;
  symbol: string;
  side: "Long" | "Short";
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  captured_at: string;
}

export interface BrokerAdapter {
  readonly meta: BrokerMeta;

  /** Can this adapter handle the given payload? */
  detectFormat(
    input: FileAdapterInput | { brokerHint: string },
  ): Promise<DetectResult>;

  /** Stream-yield canonical trades. Adapters paginate / parse internally. */
  normalizeTrades(
    input: FileAdapterInput | ApiAdapterInput,
  ): AsyncIterable<NormalizedTrade>;

  /** Fold execution-level fills into closed positions (IBKR, MT5). */
  aggregatePositions(fills: NormalizedTrade[]): NormalizedTrade[];

  /** Optional live mirror of open positions. */
  fetchOpenPositions?(input: ApiAdapterInput): Promise<OpenPosition[]>;
}
