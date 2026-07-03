/**
 * Broker registration entrypoint.
 *
 * Importing this module side-effect-registers every active broker adapter.
 * Import it once at app boot (already done in App.tsx).
 *
 * Adding a new broker:
 *   1. Create src/lib/brokers/<id>.ts implementing BrokerAdapter and calling
 *      `BrokerRegistry._register(adapter)` at the bottom.
 *   2. Add a side-effect import here.
 */

import "./bybit";
import "./binance";
import "./mexc_futures";
import "./mexc_spot";
import "./gate_futures";
import "./kraken_futures";
import "./crypto_com";
import "./coinbase";
import "./manual";
import "./csv-brokers";
import "./ibkr_flex";  // Phase 6 — IBKR Flex Web Service (server-side sync)

export { BrokerRegistry } from "./registry";
