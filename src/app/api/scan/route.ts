import { scanText } from "../../../lib/detection/scan";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { checkUpload, MAX_UPLOAD_BYTES } from "../../../lib/upload/validate";

const NO_STORE = { "Cache-Control": "no-store" };
const MULTIPART_ALLOWANCE_BYTES = 65_536;

function reply(body: object, status: number) {
  return Response.json(body, { status, headers: NO_STORE });
}

// Scans in memory only: the file and its contents are not stored or logged.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: "not_signed_in" }, 401);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES + MULTIPART_ALLOWANCE_BYTES) {
    return reply({ error: "oversized" }, 413);
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (!(file instanceof File)) return reply({ error: "missing_file" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, bytes);
  if (!check.ok) {
    return reply({ error: check.reason }, check.reason === "oversized" ? 413 : 400);
  }

  const result = scanText(check.text);
  const { data: scanId, error: saveError } = await supabase.rpc("save_scan", {
    p_file_name: file.name.slice(0, 255),
    p_file_type: check.fileType,
    p_file_size_bytes: bytes.byteLength,
    p_overall_risk: result.risk,
    p_findings: result.findings,
  });
  if (saveError) return reply({ error: "save_failed" }, 500);

  return reply(
    {
      scanId,
      fileType: check.fileType,
      sizeBytes: bytes.byteLength,
      risk: result.risk,
      findings: result.findings,
    },
    200,
  );
}
