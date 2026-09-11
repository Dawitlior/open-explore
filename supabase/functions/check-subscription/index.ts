// check-subscription — reads the trader's live Stripe subscription state and
// mirrors it into public.subscriptions so entitlement gates stay in sync.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/cors.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_TIER: Record<string, "advanced" | "ultimate"> = {
  prod_VF4v9PEhzNGFf8: "advanced",
  prod_VF4vz2I7n1QhqZ: "ultimate",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer /, ""));
    const user = userData?.user;
    if (!user?.email) return json({ error: "unauthorized" }, 401);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];

    // DB enum keeps the legacy values; the app only knows free | pro.
    let dbTier: "standard" | "advanced" | "ultimate" = "standard";
    let status: "active" | "canceled" = "canceled";
    let periodEnd: string | null = null;
    let subscriptionId: string | null = null;
    let cancelAtPeriodEnd = false;

    if (customer) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
      const sub = subs.data[0];
      if (sub) {
        const item = sub.items.data[0];
        const productId = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
        dbTier = PRODUCT_TIER[productId] ?? "standard";
        status = "active";
        subscriptionId = sub.id;
        cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
        const end = (item as unknown as { current_period_end?: number }).current_period_end
          ?? (sub as unknown as { current_period_end?: number }).current_period_end;
        periodEnd = end ? new Date(end * 1000).toISOString() : null;
      }
    }

    const appTier: "free" | "pro" = dbTier === "standard" ? "free" : "pro";

    if (dbTier !== "standard" || customer) {
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        tier: dbTier,
        status,
        provider: "stripe",
        provider_customer_id: customer?.id ?? null,
        provider_subscription_id: subscriptionId,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    return json({
      subscribed: status === "active",
      tier: appTier,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  } catch (e) {
    console.error("[check-subscription]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}));
