const https = require("https");
const { sanitizePromptField, sanitizeStringArray, MAX_LENGTHS } = require("./sanitizePromptField");

// ─── Supabase REST client (no SDK — pure https) ───────────────────────────
const SUPABASE_URL = process.env.VT_DB_URL;
const SUPABASE_KEY = process.env.VT_DB_KEY;

function supabaseRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation",
        ...(bodyStr && { "Content-Length": Buffer.byteLength(bodyStr) }),
        ...extraHeaders,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          if (res.statusCode >= 400) console.error("Supabase error", res.statusCode, JSON.stringify(parsed));
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── CORS headers ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

// ─── Operations ───────────────────────────────────────────────────────────

// Load full user state on sign-in
async function loadUserData(appleId) {
  const [profileRes, filtersRes, oppsRes] = await Promise.all([
    supabaseRequest("GET", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&limit=1`),
    supabaseRequest("GET", `/filter_frameworks?apple_id=eq.${encodeURIComponent(appleId)}&order=sort_order.asc`),
    supabaseRequest("GET", `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&order=scored_at.desc&limit=50`),
  ]);

  const profile = profileRes.data?.[0] || null;
  const filters = filtersRes.data || [];
  const opportunities = oppsRes.data || [];

  return { profile, filters, opportunities };
}

// Upsert profile (create or update)
// All string fields are sanitized server-side before storage — this is the
// choke point that protects every downstream AI prompt from stored injection.
async function saveProfile(appleId, profileData) {
  const VALID_LANGS = new Set(["en", "es", "zh", "fr", "ar", "vi"]);

  // Numeric compensation — must be a finite positive integer
  function safeComp(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
  }

  const row = {
    apple_id:            appleId,
    email:               profileData.email ? sanitizePromptField(profileData.email, 200) : null,
    display_name:        profileData.displayName ? sanitizePromptField(profileData.displayName, MAX_LENGTHS.short) : null,
    current_title:       profileData.currentTitle ? sanitizePromptField(profileData.currentTitle, MAX_LENGTHS.short) : null,
    background:          profileData.background ? sanitizePromptField(profileData.background, MAX_LENGTHS.long) : null,
    career_goal:         profileData.careerGoal ? sanitizePromptField(profileData.careerGoal, MAX_LENGTHS.long) : null,
    target_roles:        sanitizeStringArray(profileData.targetRoles, 10, MAX_LENGTHS.short),
    target_industries:   sanitizeStringArray(profileData.targetIndustries, 20, MAX_LENGTHS.short),
    compensation_min:    safeComp(profileData.compensationMin),
    compensation_target: safeComp(profileData.compensationTarget),
    location_prefs:      sanitizeStringArray(profileData.locationPrefs, 10, MAX_LENGTHS.short),
    hard_constraints:    profileData.hardConstraints ? sanitizePromptField(profileData.hardConstraints, MAX_LENGTHS.long) : null,
    threshold:           typeof profileData.threshold === "number" && profileData.threshold >= 1 && profileData.threshold <= 5
                           ? profileData.threshold : 3.5,
    lang:                VALID_LANGS.has(profileData.lang) ? profileData.lang : "en",
  };

  return supabaseRequest(
    "POST",
    "/profiles?on_conflict=apple_id",
    row,
    { "Prefer": "resolution=merge-duplicates,return=representation" }
  );
}

// Save full filter framework (replace all filters for user)
// Filter names and descriptions are sanitized server-side — they get embedded
// in behavioral-intelligence prompts and must not contain injection patterns.
async function saveFilters(appleId, filters) {
  // Delete existing filters first
  await supabaseRequest("DELETE", `/filter_frameworks?apple_id=eq.${encodeURIComponent(appleId)}`);

  if (!Array.isArray(filters) || !filters.length) return { status: 200, data: [] };

  // Cap the number of filters and sanitize each one
  const VALID_WEIGHTS = new Set([0.5, 1.0, 1.2, 1.3, 1.5, 2.0]);
  const MAX_FILTERS = 30;

  const rows = filters.slice(0, MAX_FILTERS).map((f, idx) => {
    // Sanitize name: supports string or {en, es, ...} object
    let safeName;
    if (typeof f.name === "string") {
      safeName = { en: sanitizePromptField(f.name, MAX_LENGTHS.short) };
    } else if (f.name && typeof f.name === "object") {
      safeName = Object.fromEntries(
        Object.entries(f.name).map(([k, v]) => [k, sanitizePromptField(String(v ?? ""), MAX_LENGTHS.short)])
      );
    } else {
      safeName = { en: "" };
    }

    // Sanitize description: same structure
    let safeDesc;
    if (typeof f.description === "string") {
      safeDesc = { en: sanitizePromptField(f.description, MAX_LENGTHS.medium) };
    } else if (f.description && typeof f.description === "object") {
      safeDesc = Object.fromEntries(
        Object.entries(f.description).map(([k, v]) => [k, sanitizePromptField(String(v ?? ""), MAX_LENGTHS.medium)])
      );
    } else {
      safeDesc = { en: "" };
    }

    // Weight must be one of the allowed values
    const weight = VALID_WEIGHTS.has(f.weight) ? f.weight : 1.0;

    return {
      apple_id:   appleId,
      filter_id:  sanitizePromptField(String(f.id || ""), 64),
      name:       safeName,
      description: safeDesc,
      weight,
      is_core:    Boolean(f.isCore),
      sort_order: idx,
    };
  });

  return supabaseRequest("POST", "/filter_frameworks", rows);
}

// Save a single scored opportunity
async function saveOpportunity(appleId, opp) {
  const row = {
    apple_id: appleId,
    role_title: opp.role_title,
    company: opp.company,
    overall_score: opp.overall_score,
    recommendation: opp.recommendation,
    recommendation_rationale: opp.recommendation_rationale || null,
    filter_scores: opp.filter_scores || [],
    strengths: opp.strengths || [],
    gaps: opp.gaps || [],
    narrative_bridge: opp.narrative_bridge || null,
    honest_fit_summary: opp.honest_fit_summary || null,
    jd: opp.jd || null,
  };

  return supabaseRequest("POST", "/opportunities", row);
}

// Update application status for a single opportunity
async function updateApplicationStatus(appleId, oppId, status) {
  const VALID = ["applied", "phone_screen", "interview", "final_round", "offer", "rejected", "withdrew"];
  if (!VALID.includes(status)) throw new Error(`Invalid status: ${status}`);
  return supabaseRequest(
    "PATCH",
    `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(oppId)}`,
    { application_status: status, status_updated_at: new Date().toISOString() }
  );
}

// Delete a single opportunity
async function deleteOpportunity(appleId, oppId) {
  return supabaseRequest(
    "DELETE",
    `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(oppId)}`
  );
}

// Mark an opportunity as applied
async function markApplied(appleId, oppId, appliedAt) {
  return supabaseRequest(
    "PATCH",
    `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(oppId)}`,
    { applied_at: appliedAt }
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  console.log(`[supabase] invoked method=${event.httpMethod} origin=${origin}`);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Parse body first (required before session token validation) ───────────
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    console.error("[supabase] body parse failed");
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { action, appleId, sessionToken } = body;
  console.log(`[supabase] body parsed action=${action} appleId_present=${!!appleId} sessionToken_present=${!!sessionToken} body_keys=${Object.keys(body).join(",")}`);

  if (!action || !appleId) {
    console.error(`[supabase] missing required fields action=${action} appleId=${!!appleId}`);
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "action and appleId required" }) };
  }

  // ── Session token validation ────────────────────────────────────────────────
  const clientToken = event.headers?.["x-vetted-token"] || event.headers?.["X-Vetted-Token"] || "";
  const serverSecret = (process.env.VETTED_SECRET || "").trim();
  const crypto = require("crypto");
  if (serverSecret) {
    const expectedToken = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
    const tokenToCheck = (clientToken || sessionToken || "").trim();
    console.log(`[supabase] auth action=${action} appleId_len=${appleId.length} hdr=${clientToken.length} body=${(sessionToken||"").length} expected=${expectedToken.length} got=${tokenToCheck.length} secret=${serverSecret.length}`);
    if (!tokenToCheck) {
      console.error("[supabase] auth_fail: no token");
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
    }
    if (tokenToCheck.length !== 64 || expectedToken.length !== 64) {
      console.error(`[supabase] auth_fail: bad token length got=${tokenToCheck.length}`);
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
    }
    let authOk = false;
    try {
      authOk = crypto.timingSafeEqual(Buffer.from(tokenToCheck, "hex"), Buffer.from(expectedToken, "hex"));
    } catch (e) {
      console.error(`[supabase] auth_fail: ${e.message}`);
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
    }
    if (!authOk) {
      console.error("[supabase] auth_fail: HMAC mismatch");
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
    }
  } else {
    console.warn("[supabase] VETTED_SECRET not set — skipping auth");
  }

  try {
    let result;

    switch (action) {
      case "load":
        result = await loadUserData(appleId);
        break;

      case "saveProfile":
        result = await saveProfile(appleId, body.profile);
        break;

      case "saveFilters":
        result = await saveFilters(appleId, body.filters);
        break;

      case "saveOpportunity":
        result = await saveOpportunity(appleId, body.opportunity);
        break;

      case "checkScoreLimit":
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify(await checkScoreLimit(appleId)) };
      case "incrementScoreCount":
        await incrementScoreCount(appleId);
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ ok: true }) };
      case "updateApplicationStatus":
        await updateApplicationStatus(appleId, body.opportunityId, body.status);
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ ok: true }) };
      case "deleteOpportunity":
        result = await deleteOpportunity(appleId, body.opportunityId);
        break;

      case "markApplied":
        result = await markApplied(appleId, body.opportunityId, body.appliedAt);
        break;

      case "updateApplicationStatus":
        result = await supabaseRequest(
          "PATCH",
          `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(body.opportunityId)}`,
          { application_status: body.status, status_updated_at: new Date().toISOString() }
        );
        break;

      case "loadInsight": {
        const insightRes = await supabaseRequest(
          "GET",
          `/behavioral_insights?apple_id=eq.${encodeURIComponent(appleId)}&dismissed_at=is.null&order=created_at.desc&limit=1`
        );
        result = insightRes;
        break;
      }

      case "dismissInsight":
        result = await supabaseRequest(
          "PATCH",
          `/behavioral_insights?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(body.insightId)}`,
          { dismissed_at: new Date().toISOString() }
        );
        break;

      case "actedOnInsight":
        result = await supabaseRequest(
          "PATCH",
          `/behavioral_insights?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(body.insightId)}`,
          { acted_on_at: new Date().toISOString() }
        );
        break;

      case "loadWorkspace": {
        const wsData = await loadWorkspace(appleId);
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ success: true, data: wsData }) };
      }

      case "upsertWorkspaceRole":
        result = await upsertWorkspaceRole(appleId, body.role);
        break;

      case "deleteWorkspaceRole":
        await deleteWorkspaceRole(appleId, body.roleId);
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ ok: true }) };

      case "archiveWorkspaceRole":
        result = await archiveWorkspaceRole(appleId, body.roleId);
        break;

      case "unarchiveWorkspaceRole":
        result = await unarchiveWorkspaceRole(appleId, body.roleId, body.restoreStatus);
        break;

      case "markWorkspaceApplied":
        result = await markWorkspaceApplied(appleId, body.roleId);
        break;

      case "touchWorkspaceRole":
        await touchWorkspaceRole(appleId, body.roleId);
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ ok: true }) };

      case "saveWorkspaceReminder":
        result = await saveWorkspaceReminder(appleId, body.reminder);
        break;

      case "completeWorkspaceReminder":
        result = await completeWorkspaceReminder(appleId, body.reminderId);
        break;

      default:
        return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ success: true, data: result?.data || result }),
    };

  } catch (err) {
    console.error("Supabase function error:", err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// ─── Workspace operations ─────────────────────────────────────────────────

// Load all workspace roles + reminders for a user.
// Also auto-migrates any old `opportunities` rows that don't yet have a workspace_role.
async function loadWorkspace(appleId) {
  const [rolesRes, remindersRes, oppsRes] = await Promise.all([
    supabaseRequest(
      "GET",
      `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&order=updated_at.desc&limit=200`
    ),
    supabaseRequest(
      "GET",
      `/workspace_reminders?apple_id=eq.${encodeURIComponent(appleId)}&completed=eq.false&order=remind_at.asc&limit=200`
    ),
    supabaseRequest(
      "GET",
      `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&order=scored_at.desc&limit=200`
    ),
  ]);

  let roles = rolesRes.data || [];
  const reminders = remindersRes.data || [];
  const opportunities = oppsRes.data || [];

  // ── Auto-migrate old opportunities that aren't in workspace_roles yet ──
  if (opportunities.length > 0) {
    const existingRoleIds = new Set(roles.map(r => r.role_id));
    const toMigrate = opportunities.filter(opp => !existingRoleIds.has(String(opp.id)));

    if (toMigrate.length > 0) {
      console.log(`[loadWorkspace] migrating ${toMigrate.length} opportunities → workspace_roles for ${appleId}`);
      const migrationRows = toMigrate.map(opp => ({
        apple_id:  appleId,
        role_id:   String(opp.id),
        company:   opp.company   || null,
        title:     opp.role_title || null,
        source_url: null,
        status:    opp.applied_at ? "applied" : (opp.recommendation || "monitor"),
        vq_score:  opp.overall_score != null ? Number(opp.overall_score) : null,
        framework_snapshot: {
          recommendation:           opp.recommendation           || null,
          recommendation_rationale: opp.recommendation_rationale || null,
          filter_scores:            opp.filter_scores            || [],
          strengths:                opp.strengths                || [],
          gaps:                     opp.gaps                     || [],
          narrative_bridge:         opp.narrative_bridge         || null,
          honest_fit_summary:       opp.honest_fit_summary       || null,
          jd:                       opp.jd                       || null,
        },
        last_viewed_at: null,
        next_action:    null,
        next_action_at: null,
        notes:          null,
        created_at:     opp.scored_at || new Date().toISOString(),
        updated_at:     opp.scored_at || new Date().toISOString(),
      }));

      try {
        await supabaseRequest(
          "POST",
          "/workspace_roles?on_conflict=apple_id,role_id",
          migrationRows,
          { "Prefer": "resolution=ignore-duplicates,return=minimal" }
        );
        // Re-fetch so the response includes the freshly migrated rows
        const refreshed = await supabaseRequest(
          "GET",
          `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&order=updated_at.desc&limit=200`
        );
        roles = refreshed.data || roles;
      } catch (e) {
        console.error("[loadWorkspace] migration error (non-fatal):", e.message);
        // Non-fatal — return whatever workspace_roles we already have
      }
    }
  }

  return { roles, reminders };
}

// Upsert a workspace role — creates or updates based on (apple_id, role_id) unique key
const VALID_WS_STATUSES = new Set(["queued","pursue","monitor","pass","applied","interviewing","offer","archived"]);
async function upsertWorkspaceRole(appleId, role) {
  const row = {
    apple_id:           appleId,
    role_id:            String(role.role_id).slice(0, 64),
    company:            role.company  ? sanitizePromptField(role.company,  MAX_LENGTHS.short) : null,
    title:              role.title    ? sanitizePromptField(role.title,    MAX_LENGTHS.short) : null,
    source_url:         role.source_url ? sanitizePromptField(role.source_url, 500) : null,
    status:             VALID_WS_STATUSES.has(role.status) ? role.status : "queued",
    vq_score:           role.vq_score != null ? Math.min(Math.max(Number(role.vq_score), 0), 5) : null,
    framework_snapshot: role.framework_snapshot || null,
    last_viewed_at:     role.last_viewed_at || null,
    next_action:        role.next_action ? sanitizePromptField(role.next_action, MAX_LENGTHS.medium) : null,
    next_action_at:     role.next_action_at || null,
    notes:              role.notes ? sanitizePromptField(role.notes, MAX_LENGTHS.long) : null,
    updated_at:         new Date().toISOString(),
  };

  return supabaseRequest(
    "POST",
    "/workspace_roles?on_conflict=apple_id,role_id",
    row,
    { "Prefer": "resolution=merge-duplicates,return=representation" }
  );
}

// Hard delete a workspace role
async function deleteWorkspaceRole(appleId, roleId) {
  return supabaseRequest(
    "DELETE",
    `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(roleId)}`
  );
}

// Archive a workspace role (soft delete)
async function archiveWorkspaceRole(appleId, roleId) {
  return supabaseRequest(
    "PATCH",
    `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(roleId)}`,
    { status: "archived", updated_at: new Date().toISOString() }
  );
}

// Mark a workspace role as applied
async function markWorkspaceApplied(appleId, roleId) {
  return supabaseRequest(
    "PATCH",
    `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(roleId)}`,
    { status: "applied", updated_at: new Date().toISOString() }
  );
}

// Restore an archived workspace role to its previous recommendation status
async function unarchiveWorkspaceRole(appleId, roleId, restoreStatus = "monitor") {
  return supabaseRequest(
    "PATCH",
    `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(roleId)}`,
    { status: restoreStatus, updated_at: new Date().toISOString() }
  );
}

// Update last_viewed_at for a workspace role
async function touchWorkspaceRole(appleId, roleId) {
  return supabaseRequest(
    "PATCH",
    `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(roleId)}`,
    { last_viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  );
}

// Create or update a workspace reminder
async function saveWorkspaceReminder(appleId, reminder) {
  // Look up the workspace_roles.id (uuid primary key) for the given role_id string
  let workspaceRoleDbId = null;
  if (reminder.role_id) {
    const lookup = await supabaseRequest(
      "GET",
      `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&role_id=eq.${encodeURIComponent(reminder.role_id)}&select=id&limit=1`
    );
    workspaceRoleDbId = lookup.data?.[0]?.id || null;
  }

  const safeLabel = reminder.label ? sanitizePromptField(reminder.label, MAX_LENGTHS.short) : null;

  if (reminder.id) {
    // Update existing reminder
    return supabaseRequest(
      "PATCH",
      `/workspace_reminders?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(reminder.id)}`,
      {
        remind_at:  reminder.remind_at,
        label:      safeLabel,
        completed:  reminder.completed || false,
      }
    );
  } else {
    // Create new reminder
    return supabaseRequest("POST", "/workspace_reminders", {
      apple_id:           appleId,
      workspace_role_id:  workspaceRoleDbId,
      remind_at:          reminder.remind_at,
      label:              safeLabel,
      completed:          false,
    });
  }
}

// Mark a reminder as completed
async function completeWorkspaceReminder(appleId, reminderId) {
  return supabaseRequest(
    "PATCH",
    `/workspace_reminders?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(reminderId)}`,
    { completed: true }
  );
}

// ─── Tier gating — check if user can score ────────────────────────────────
async function checkScoreLimit(appleId) {
  const res = await supabaseRequest("GET", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&select=tier,scores_used,scores_reset_date&limit=1`);
  const profile = res.data?.[0];
  if (!profile) return { allowed: true, tier: "free", scoresUsed: 0, scoresRemaining: 10 };

  const tier = profile.tier || "free";
  if (tier !== "free") return { allowed: true, tier, scoresUsed: profile.scores_used || 0, scoresRemaining: null };

  // Check if reset date has passed — reset if so
  const now = new Date();
  const resetDate = profile.scores_reset_date ? new Date(profile.scores_reset_date) : null;
  let scoresUsed = profile.scores_used || 0;

  if (!resetDate || now >= resetDate) {
    // Reset the counter
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabaseRequest("PATCH", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`, {
      scores_used: 0,
      scores_reset_date: nextReset.toISOString().split("T")[0],
    });
    scoresUsed = 0;
  }

  const limit = 10;
  const allowed = scoresUsed < limit;
  return { allowed, tier, scoresUsed, scoresRemaining: limit - scoresUsed };
}

// ─── Tier gating — increment score count ─────────────────────────────────
async function incrementScoreCount(appleId) {
  const res = await supabaseRequest("GET", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&select=scores_used&limit=1`);
  const current = res.data?.[0]?.scores_used || 0;
  await supabaseRequest("PATCH", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`, {
    scores_used: current + 1,
  });
}
