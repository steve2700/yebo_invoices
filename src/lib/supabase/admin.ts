import { createClient } from "@supabase/supabase-js";

// A Supabase client that bypasses row level security. Use it ONLY in server code (server actions and
// API routes), only for things the signed-in user has already been checked for, and never import it
// into a "use client" file. The service role key must never be prefixed with NEXT_PUBLIC_.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
