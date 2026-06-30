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

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function authorisedForSchool(supabase: ReturnType<typeof createClient>, req: Request, school_id: string) {
  const token = bearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "missing_staff_token" };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return { ok: false, status: 401, error: "invalid_staff_token" };
  }

  const { data: platformAdmin, error: platformError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (platformError) {
    return { ok: false, status: 500, error: "platform_admin_check_failed" };
  }
  if (platformAdmin) {
    return { ok: true, userId };
  }

  const { data: schoolUser, error: roleError } = await supabase
    .from("school_users")
    .select("user_id, role")
    .eq("school_id", school_id)
    .eq("user_id", userId)
    .eq("role", "coach")
    .maybeSingle();
  if (roleError) {
    return { ok: false, status: 500, error: "school_role_check_failed" };
  }
  if (!schoolUser) {
    return { ok: false, status: 403, error: "not_authorised_for_school" };
  }

  return { ok: true, userId };
}

// --- Student login credential generation -----------------------------------
// Username: FirstName + LastInitial + number (e.g. JamesS1), unique per school.
// Password: kid-friendly Colour/adjective + Animal + 2 digits (e.g. BlueFox42).
const PASSWORD_ADJECTIVES = ["Blue","Green","Happy","Brave","Sunny","Swift","Lucky","Calm","Bright","Cosy","Jolly","Kind","Bold","Mighty","Speedy"];
const PASSWORD_NOUNS = ["Fox","Lion","Panda","Tiger","Otter","Koala","Dolphin","Falcon","Bear","Rocket","Comet","Maple","River","Cloud","Star"];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function generateStudentPassword(): string {
  const digits = String(Math.floor(Math.random() * 90) + 10);
  return `${randomFrom(PASSWORD_ADJECTIVES)}${randomFrom(PASSWORD_NOUNS)}${digits}`;
}

function usernameStem(first: string, last: string): string {
  const firstPart = String(first || "").replace(/[^A-Za-z0-9]/g, "");
  const initial = String(last || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 1);
  const stem = (firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()) + initial.toUpperCase();
  return stem || "Runner";
}

function generateStudentUsername(first: string, last: string, used: Set<string>): string {
  const stem = usernameStem(first, last);
  let n = 1;
  let candidate = `${stem}${n}`;
  while (used.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${stem}${n}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

// Synthetic, never-emailed login address for username-only auth.
function authEmailForUsername(username: string, domain: string): string {
  const normalized = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${normalized}@${domain}`;
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

  const supabaseUrl = Deno.env.get("CORSO_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("CORSO_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
  if (!isUuid(school_id)) {
    return jsonResponse({ ok: false, error: "invalid_school_id" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const auth = await authorisedForSchool(supabase, req, school_id);
  if (!auth.ok) {
    return jsonResponse({ ok: false, error: auth.error }, auth.status);
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

  const { data, error } = await supabase
    .from("students")
    .upsert(parsed.rows, { onConflict: "school_id,barcode" })
    .select("id, barcode, first_name, last_name, username, user_id");

  if (error) {
    return jsonResponse({ ok: false, error: "student_upsert_failed", detail: error.message }, 500);
  }

  // Create student login accounts for any imported students that do not yet
  // have one. Usernames are unique per school; passwords are returned ONCE here
  // so the coach can hand them out, and are never persisted in plaintext.
  const studentDomain = (Deno.env.get("CORSO_STUDENT_AUTH_DOMAIN") || "students.corso.local").trim().toLowerCase();
  const imported = data || [];

  // Seed the used-username set with usernames already taken in this school.
  const { data: existingUsernames } = await supabase
    .from("students")
    .select("username")
    .eq("school_id", school_id)
    .not("username", "is", null);
  const usedUsernames = new Set<string>(
    (existingUsernames || [])
      .map((r: { username: string | null }) => String(r.username || "").toLowerCase())
      .filter(Boolean),
  );

  const credentials: Array<{ student_id: string; barcode: string; name: string; username: string; password: string }> = [];
  const credential_errors: Array<{ student_id: string; reason: string }> = [];

  for (const row of imported) {
    if (row.user_id && row.username) {
      continue; // already has a login account
    }
    const username = row.username || generateStudentUsername(row.first_name, row.last_name, usedUsernames);
    const password = generateStudentPassword();
    const email = authEmailForUsername(username, studentDomain);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "student", school_id, username },
    });
    if (createError || !created?.user?.id) {
      credential_errors.push({ student_id: row.id, reason: createError?.message || "auth_create_failed" });
      continue;
    }

    const { error: linkError } = await supabase
      .from("students")
      .update({ username, user_id: created.user.id })
      .eq("id", row.id);
    if (linkError) {
      credential_errors.push({ student_id: row.id, reason: linkError.message });
      continue;
    }

    credentials.push({
      student_id: row.id,
      barcode: row.barcode,
      name: `${row.first_name} ${row.last_name}`.trim(),
      username,
      password,
    });
  }

  return jsonResponse({
    ok: true,
    dry_run: false,
    imported_count: imported.length,
    credentials_created: credentials.length,
    credentials, // shown once; not stored in plaintext anywhere
    credential_errors,
    skipped_count: parsed.skipped_details.length,
    skipped_details: parsed.skipped_details,
  });
});
