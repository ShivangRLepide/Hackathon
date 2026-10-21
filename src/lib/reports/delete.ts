import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes one scan. The findings for the scan are removed by the composite foreign key
 * (on delete cascade). RLS (scans_delete_own) limits the delete to the caller's own rows.
 *
 * RLS hides blocked rows instead of raising an error, so the deleted row is requested
 * back. No returned row means nothing was deleted, and that is reported as a failure.
 */
export async function deleteScan(supabase: SupabaseClient, scanId: string): Promise<void> {
  const { data, error } = await supabase.from("scans").delete().eq("id", scanId).select("id");
  if (error) throw new Error("delete_failed");
  if (!data || data.length === 0) throw new Error("not_deleted");
}
