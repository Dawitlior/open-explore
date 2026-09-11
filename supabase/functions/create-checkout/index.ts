// create-checkout — opens a Stripe Checkout session for the signed-in trader.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/cors.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Single paid plan — Orca Pro. Legacy keys kept so older clients keep working.
const PRO_PRICE = "price_1UEalkLHBUsnz0dmmg1huRmq";
const PRICES: Record<string, string> = {
  pro: PRO_PRICE,
  ultimate: PRO_PRICE,
  advanced: "price_1UEalRLHBUsnz0dmv8FShrt5",
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer /, ""));
    const user = userData?.user;
    if (!user?.email) return json({ error: "unauthorized" }, 401);

    const { tier } = (await req.json().catch(() => ({}))) as { tier?: string };
    const price = tier ? PRICES[tier] : undefined;
    if (!price) return json({ error: "invalid_tier" }, 400);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") ?? "https://orcainvestment.co.il";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price, quantity: 1 }],
      mode: "subscription",
      client_reference_id: user.id,
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[create-checkout]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}));
