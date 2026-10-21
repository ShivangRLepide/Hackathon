import { createBrowserClient } from "@supabase/ssr";

// Next.js inlines NEXT_PUBLIC_ values at build time, so the names must stay literal.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
