# Edge-side Broker Adapters

This directory mirrors `src/lib/brokers/` for Deno edge functions.

Each `<id>.ts` file should re-export the same `BrokerAdapter` instance as its
client counterpart, importing from a pure (DOM-free, fetch-only) shared core.

Pattern (Phase 1+):

```ts
// supabase/functions/_shared/brokers/bybit.ts
export { bybitAdapter } from "./_core/bybit.ts";
```

The `_core/` modules contain the actual logic and are imported by both the
client wrapper (`src/lib/brokers/bybit.ts`) and the edge wrapper above.
