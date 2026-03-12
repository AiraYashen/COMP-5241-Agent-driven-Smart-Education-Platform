import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy browser client
let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Browser-safe client (uses anon key) — accessed as a Proxy so it initialises lazily
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

// Server-side admin client (uses service role key — server only, never expose to browser)
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
