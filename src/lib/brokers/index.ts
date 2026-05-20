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
// import "./binance";   // Phase 4
// import "./ibkr";      // Phase 6
// import "./mt5";
// import "./generic-csv";

export { BrokerRegistry } from "./registry";
