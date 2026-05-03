// ── register-device.js ────────────────────────────────────────────────────
// Stores or refreshes a device push token for a user.
//
// POST body:
//   { appleId: string, sessionToken: string, token: string, platform: "ios" }
//
// Upserts into user_devices table (keyed on appleId + token).

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "http://localhost:5173",
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, context) {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "null",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const { appleId, sessionToken, token, platform = "ios", lang, prefs = {}, langUpdateOnly = false } = await req.json();

  if (!appleId) {
    return new Response(JSON.stringify({ error: "Missing appleId" }), { status: 400 });
  }

  // ── Lang-only update: user changed language — patch all their device rows ──
  if (langUpdateOnly && lang) {
    const { error } = await supabase
      .from("user_devices")
      .update({ lang, updated_at: new Date().toISOString() })
      .eq("apple_id", appleId);

    if (error) {
      console.error("[register-device] lang update error:", error);
      return new Response(JSON.stringify({ error: "Failed to update lang" }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400 });
  }

  // Upsert — if same user registers same token again (app restart), just update timestamp
  const { error } = await supabase
    .from("user_devices")
    .upsert({
      apple_id:         appleId,
      token,
      platform,
      lang:             lang || "en",
      notif_reminders:  prefs.reminders  ?? true,
      notif_follow_up:  prefs.followUp   ?? true,
      notif_staleness:  prefs.staleness  ?? true,
      notif_timeline:   prefs.timeline   ?? true,
      notif_digest:     prefs.digest     ?? true,
      updated_at:       new Date().toISOString(),
    }, { onConflict: "apple_id,token" });

  if (error) {
    console.error("[register-device] supabase error:", error);
    return new Response(JSON.stringify({ error: "Failed to register device" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
