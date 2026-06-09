import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-school-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StudentRow = {
  school_id: string;
  barcode: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  year_group: string;
  class_name: string;
  active: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(csv: string, school_id: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return { rows: [] as StudentRow[], skipped_details: [{ row: 0, reason: "empty_csv" }] };
  }
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const seen = new Set<string>();
  const rows: StudentRow[] = [];
  const skipped_details: Array<Record<string, unknown>> = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      row[header] = values[cellIndex] || "";
    });
    const barcode = String(row.barcode || row.student_id || row.code || "").trim().toUpperCase();
    const first_name = String(row.first_name || row.first || "").trim();
    const last_name = String(row.last_name || row.last || "").trim();
    const year_group = String(row.year_group || row.year || "").trim();
    const class_name = String(row.class_name || row.class || row.cls || "").trim();
    const rowNumber = index + 2;
    const duplicateKey = `${school_id}:${barcode}`;

    if (!barcode || !first_name || !last_name || !year_group || !class_name) {
      skipped_details.push({ row: rowNumber, barcode, reason: "missing_required_fields" });
      return;
    }
    if (seen.has(duplicateKey)) {
      skipped_details.push({ row: rowNumber, barcode, reason: "duplicate_barcode" });
      return;
    }
    seen.add(duplicateKey);
    rows.push({
      school_id,
      barcode,
      first_name,
      last_name,
      preferred_name: row.preferred_name || row.name || null,
      year_group,
      class_name,
      active: true,
    });
  });

  return { rows, skipped_details };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "missing_server_config" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const school_id = String(body.school_id || req.headers.get("x-school-id") || "").trim();
  const csv = String(body.csv || "");
  const dry_run = body.dry_run !== false;

  if (!school_id) {
    return jsonResponse({ ok: false, error: "missing_school_id" }, 400);
  }

  const parsed = parseCsv(csv, school_id);
  if (dry_run) {
    return jsonResponse({
      ok: true,
      dry_run: true,
      valid_count: parsed.rows.length,
      skipped_count: parsed.skipped_details.length,
      skipped_details: parsed.skipped_details,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("students")
    .upsert(parsed.rows, { onConflict: "school_id,barcode" })
    .select("id, barcode");

  if (error) {
    return jsonResponse({ ok: false, error: "student_upsert_failed", detail: error.message }, 500);
  }

  return jsonResponse({
    ok: true,
    dry_run: false,
    imported_count: data?.length || 0,
    skipped_count: parsed.skipped_details.length,
    skipped_details: parsed.skipped_details,
  });
});
