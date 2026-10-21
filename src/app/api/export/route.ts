import { findingsCsv } from "../../../lib/export/csv";
import { joinFindings } from "../../../lib/reports/findings";
import { loadReports } from "../../../lib/reports/load";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const NO_STORE = { "Cache-Control": "no-store" };

// Exports masked values only. Raw matched values are never stored, so none can appear here.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "not_signed_in" }, { status: 401, headers: NO_STORE });
  }

  try {
    const { scans, findings } = await loadReports(supabase);
    const csv = findingsCsv(joinFindings(findings, scans));
    return new Response(csv, {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="minidsp-findings.csv"',
      },
    });
  } catch {
    return Response.json({ error: "export_failed" }, { status: 500, headers: NO_STORE });
  }
}
