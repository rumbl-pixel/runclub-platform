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
  const code = String(body.code || body.barcode || "").trim().toUpperCase();
  const dry_run = body.dry_run === true;

  if (!school_id) {
    return jsonResponse({ ok: false, error: "missing_school_id" }, 400);
  }
  if (!code) {
    return jsonResponse({ ok: false, error: "missing_code" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("students")
    .select("id, school_id, barcode, preferred_name, first_name, last_name, year_group, class_name, active")
    .eq("school_id", school_id)
    .eq("barcode", code)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return jsonResponse({ ok: false, error: "student_lookup_failed", detail: error.message }, 500);
  }
  if (!data) {
    return jsonResponse({ ok: false, error: "student_not_found", dry_run }, 404);
  }

  return jsonResponse({
    ok: true,
    dry_run,
    student_id: data.id,
    student: {
      id: data.id,
      barcode: data.barcode,
      name: data.preferred_name || `${data.first_name} ${data.last_name}`.trim(),
      year: data.year_group,
      cls: data.class_name,
    },
  });
});
