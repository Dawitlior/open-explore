Deno.test("probe env", () => {
  const keys = Object.keys(Deno.env.toObject()).filter(k => k.startsWith("SUPABASE")).sort();
  console.log("SUPABASE env keys:", keys);
});
