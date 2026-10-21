"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./browser";

/**
 * Returns the browser Supabase client once a signed-in user is confirmed.
 * Redirects to the sign-in page when there is no user. Returns null while checking.
 */
export function useSignedInClient(): SupabaseClient | null {
  const router = useRouter();
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (user) {
        setClient(supabase);
      } else {
        router.replace("/");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  return client;
}
