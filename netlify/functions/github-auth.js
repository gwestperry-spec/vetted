// ─── GitHub OAuth for web sign-in ─────────────────────────────────────────
// Two-step flow:
//   GET  /.netlify/functions/github-auth             → redirects to GitHub OAuth
//   GET  /.netlify/functions/github-auth?code=<code> → exchanges code, creates session, redirects to app
//
// Required Netlify env vars:
//   GITHUB_CLIENT_ID      — from your GitHub OAuth App settings
//   GITHUB_CLIENT_SECRET  — from your GitHub OAuth App settings
//   VETTED_SECRET         — same HMAC secret used by apple-auth.js
//
// GitHub OAuth App setup (github.com → Settings → Developer settings → OAuth Apps → New):
//   Homepage URL:      https://tryvettedai.com
//   Callback URL:      https://celebrated-gelato-56d525.netlify.app/.netlify/functions/github-auth

const https = require("https");
const crypto = require("crypto");

const CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const VETTED_SECRET = (process.env.VETTED_SECRET || "").trim();

// APP_BASE: Netlify automatically sets process.env.URL to the primary site URL.
// Set APP_BASE as a Netlify env var to override (e.g. for staging vs production).
// Never hardcode this — it breaks sign-in when deploying to a custom domain.
const APP_BASE = process.env.APP_BASE || process.env.URL || "https://tryvettedai.com";

// ── HMAC session token (same algorithm as apple-auth.js) ─────────────────
function makeSessionToken(userId) {
  return crypto.createHmac("sha256", VETTED_SECRET).update(userId).digest("hex");
}

// ── HTTPS helper ──────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { "User-Agent": "vetted-app", ...headers },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    ).on("error", reject);
  });
}

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "vetted-app",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Supabase upsert (mirrors apple-auth.js) ────────────────────────────────
const SUPABASE_URL = process.env.VT_DB_URL;
const SUPABASE_KEY = process.env.VT_DB_KEY;

function supabaseUpsert(table, data, conflictCol) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    const payload = JSON.stringify(data);
    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}?on_conflict=${conflictCol}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "resolution=merge-duplicates,return=representation",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const { code, error: oauthError } = event.queryStringParameters || {};

  // ── Step 1: No code — redirect to GitHub to start OAuth ─────────────────
  if (!code && !oauthError) {
    if (!CLIENT_ID) {
      return {
        statusCode: 500,
        body: "GitHub OAuth not configured (GITHUB_CLIENT_ID missing).",
      };
    }
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("scope", "user:email");
    authUrl.searchParams.set(
      "redirect_uri",
      `${APP_BASE}/.netlify/functions/github-auth`
    );
    return {
      statusCode: 302,
      headers: { Location: authUrl.toString() },
      body: "",
    };
  }

  // ── OAuth error returned from GitHub ────────────────────────────────────
  if (oauthError) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_BASE}/#gh_auth_error?reason=github_denied` },
      body: "",
    };
  }

  // ── Step 2: Exchange code for access token ────────────────────────────
  try {
    const tokenRes = await httpsPost(
      "https://github.com/login/oauth/access_token",
      { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }
    );

    const accessToken = tokenRes.body?.access_token;
    if (!accessToken) {
      console.error("[github-auth] token exchange failed:", tokenRes.body);
      return {
        statusCode: 302,
        headers: { Location: `${APP_BASE}/#gh_auth_error?reason=token_exchange` },
        body: "",
      };
    }

    // ── Get GitHub user info ──────────────────────────────────────────────
    const userRes = await httpsGet("https://api.github.com/user", {
      Authorization: `Bearer ${accessToken}`,
    });

    const ghUser = userRes.body;
    if (!ghUser?.id) {
      return {
        statusCode: 302,
        headers: { Location: `${APP_BASE}/#gh_auth_error?reason=user_fetch` },
        body: "",
      };
    }

    // Get primary email if not public
    let email = ghUser.email;
    if (!email) {
      const emailRes = await httpsGet("https://api.github.com/user/emails", {
        Authorization: `Bearer ${accessToken}`,
      });
      const primary = Array.isArray(emailRes.body)
        ? emailRes.body.find((e) => e.primary)
        : null;
      email = primary?.email || null;
    }

    // ── Create a stable user ID using "gh_" prefix + GitHub user ID ───────
    // This namespaces GitHub users from Apple users in the same DB table.
    const userId = `gh_${ghUser.id}`;
    const sessionToken = makeSessionToken(userId);
    const displayName = ghUser.name || ghUser.login || "User";

    // ── Upsert profile in Supabase ────────────────────────────────────────
    await supabaseUpsert(
      "profiles",
      {
        apple_id: userId,            // reuse apple_id column for all user IDs
        display_name: displayName,
        email: email || null,
        auth_provider: "github",
        tier: "free",
        updated_at: new Date().toISOString(),
      },
      "apple_id"
    ).catch((err) => {
      // Non-fatal — user can still sign in even if upsert fails
      console.error("[github-auth] profile upsert error:", err.message);
    });

    // ── Redirect back to app with session info ────────────────────────────
    // Pass via URL fragment (never hits server logs) so the app can pick it up.
    const fragment = new URLSearchParams({
      gh_user_id:    userId,
      gh_name:       displayName,
      gh_email:      email || "",
      gh_token:      sessionToken,
    }).toString();

    return {
      statusCode: 302,
      headers: { Location: `${APP_BASE}/#gh_auth?${fragment}` },
      body: "",
    };
  } catch (err) {
    console.error("[github-auth] unexpected error:", err.message);
    return {
      statusCode: 302,
      headers: { Location: `${APP_BASE}/#gh_auth_error?reason=server` },
      body: "",
    };
  }
};
