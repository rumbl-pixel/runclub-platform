import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-school-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("CORSO_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("CORSO_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "missing_server_config" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const school_id = String(body.school_id || req.headers.get("x-school-id") || "").trim();
  const code = String(body.code || "").trim().toUpperCase();

  if (!school_id) {
    return jsonResponse({ ok: false, error: "missing_school_id" }, 400);
  }
  if (!code) {
    return jsonResponse({ ok: false, error: "missing_code" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: link, error: linkError } = await supabase
    .from("guardian_links")
    .select("id, school_id, student_id, code, status, expires_at")
    .eq("school_id", school_id)
    .eq("code", code)
    .maybeSingle();

  if (linkError) {
    return jsonResponse({ ok: false, error: "guardian_lookup_failed", detail: linkError.message }, 500);
  }

  async function audit(result: string, reason: string, student_id?: string) {
    await supabase.from("scan_audit_logs").insert({
      school_id,
      student_id: student_id || null,
      barcode: code.slice(-6),
      source: "guardian-access",
      success: result === "allowed",
      duplicate: false,
      undo: false,
      message: reason,
      metadata: {
        source: "guardian-access",
        result,
        code_suffix: code.slice(-4),
        guardian_link_id: link?.id || null,
      },
    });
  }

  if (!link) {
    await audit("denied", "Guardian code not found");
    return jsonResponse({ ok: false, error: "guardian_code_not_found" }, 404);
  }
  if (link.status !== "active") {
    await audit("denied", "Guardian code revoked", link.student_id);
    return jsonResponse({ ok: false, error: "guardian_code_revoked" }, 403);
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    await audit("denied", "Guardian code expired", link.student_id);
    return jsonResponse({ ok: false, error: "guardian_code_expired" }, 403);
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, school_id, barcode, preferred_name, first_name, last_name, year_group, class_name, active")
    .eq("school_id", school_id)
    .eq("id", link.student_id)
    .eq("active", true)
    .maybeSingle();

  if (studentError) {
    return jsonResponse({ ok: false, error: "student_lookup_failed", detail: studentError.message }, 500);
  }
  if (!student) {
    await audit("denied", "Linked student not found", link.student_id);
    return jsonResponse({ ok: false, error: "student_not_found" }, 404);
  }

  const { data: totals } = await supabase
    .from("leaderboard_totals")
    .select("total_laps, total_km")
    .eq("school_id", school_id)
    .eq("student_id", student.id)
    .maybeSingle();

  await audit("allowed", "Guardian progress viewed", student.id);

  return jsonResponse({
    ok: true,
    access_type: "guardian",
    student: {
      id: student.id,
      barcode: student.barcode,
      name: student.preferred_name || `${student.first_name} ${student.last_name}`.trim(),
      year: student.year_group,
      cls: student.class_name,
      laps: Number(totals?.total_laps || 0),
      minutes: 0,
      total_km: Number(totals?.total_km || 0),
    },
  });
});
