// Deno test: verifies per-user RLS isolation on public.exchange_credentials.
// Run with: supabase--test_edge_functions.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test({
  name: "exchange_credentials — per-user RLS isolation",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const stamp = Date.now();
  const emailA = `rls_a_${stamp}@example.test`;
  const emailB = `rls_b_${stamp}@example.test`;
  const password = "Rls!Test-1234-Rls!Test-1234";

  const { data: ua, error: eA } = await admin.auth.admin.createUser({
    email: emailA, password, email_confirm: true,
  });
  if (eA) throw eA;
  const { data: ub, error: eB } = await admin.auth.admin.createUser({
    email: emailB, password, email_confirm: true,
  });
  if (eB) throw eB;

  const userA = ua.user!.id;
  const userB = ub.user!.id;

  const clientA = createClient(URL, ANON, { auth: { persistSession: false } });
  const clientB = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: sA } = await clientA.auth.signInWithPassword({ email: emailA, password });
  if (sA) throw sA;
  const { error: sB } = await clientB.auth.signInWithPassword({ email: emailB, password });
  if (sB) throw sB;

  try {
    // --- INSERT as self -------------------------------------------------
    const { data: insA, error: insAErr } = await clientA
      .from("exchange_credentials")
      .insert({
        user_id: userA, provider: "bybit", label: "main",
        api_key: "AKEY_A_TEST", api_secret: "SECRET_A_TEST", scope: "read_only",
      })
      .select("id, user_id, secret_id")
      .single();
    assertEquals(insAErr, null, `A insert failed: ${insAErr?.message}`);
    assert(insA && insA.id && insA.secret_id, "A row should be created with a vault secret_id");

    const { data: insB, error: insBErr } = await clientB
      .from("exchange_credentials")
      .insert({
        user_id: userB, provider: "binance", label: "main",
        api_key: "AKEY_B_TEST", api_secret: "SECRET_B_TEST", scope: "read_only",
      })
      .select("id, user_id, secret_id")
      .single();
    assertEquals(insBErr, null, `B insert failed: ${insBErr?.message}`);
    assert(insB);

    // --- INSERT spoofing another user must be rejected -------------------
    const { error: spoofErr } = await clientA
      .from("exchange_credentials")
      .insert({
        user_id: userB, provider: "bybit", label: "spoof",
        api_key: "AKEY_X_TEST", api_secret: "SECRET_X", scope: "read_only",
      });
    assert(spoofErr, "RLS/trigger must reject inserting a row owned by another user");

    // --- Forbidden scope rejected ---------------------------------------
    const { error: scopeErr } = await clientA
      .from("exchange_credentials")
      .insert({
        user_id: userA, provider: "bybit", label: "trade-scope",
        api_key: "AKEY_T", api_secret: "SECRET_T", scope: "trade",
      });
    assert(scopeErr, "Non-read-only scope must be rejected");

    // --- SELECT only sees own rows --------------------------------------
    const { data: selA, error: selAErr } = await clientA
      .from("exchange_credentials").select("id, user_id");
    assertEquals(selAErr, null);
    assertEquals(selA?.length, 1, "A should only see its own row");
    assertEquals(selA?.[0].user_id, userA);

    const { data: selB } = await clientB
      .from("exchange_credentials").select("id, user_id");
    assertEquals(selB?.length, 1, "B should only see its own row");
    assertEquals(selB?.[0].user_id, userB);

    // A explicitly querying B's id must return zero rows
    const { data: peek } = await clientA
      .from("exchange_credentials").select("id").eq("id", insB!.id);
    assertEquals(peek?.length ?? 0, 0, "A must not see B's row even when querying by id");

    // --- UPDATE other user's row is a no-op ------------------------------
    const { data: updA } = await clientA
      .from("exchange_credentials")
      .update({ label: "hacked-by-A" })
      .eq("id", insB!.id)
      .select();
    assertEquals(updA?.length ?? 0, 0, "A must not update B's row");

    // --- DELETE other user's row is a no-op ------------------------------
    const { data: delA } = await clientA
      .from("exchange_credentials")
      .delete()
      .eq("id", insB!.id)
      .select();
    assertEquals(delA?.length ?? 0, 0, "A must not delete B's row");

    // Confirm B's row is still intact
    const { data: stillB } = await clientB
      .from("exchange_credentials").select("id, label").eq("id", insB!.id).single();
    assertEquals(stillB?.label, "main");

    // --- Plain-text api_secret is wiped by the trigger ------------------
    const { data: leakRows } = await clientA
      .from("exchange_credentials").select("id, api_secret");
    assert(leakRows && leakRows.length > 0, "A should still have its own row");
    for (const row of leakRows ?? []) {
      assertEquals(row.api_secret, null, "api_secret must never be persisted in plain text");
    }
  } finally {
    await admin.from("exchange_credentials").delete().in("user_id", [userA, userB]);
    await admin.auth.admin.deleteUser(userA);
    await admin.auth.admin.deleteUser(userB);
    }
  },
});
