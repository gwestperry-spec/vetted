import { useState, useEffect, useRef } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../utils/handleError.js";

// ── useAuth ────────────────────────────────────────────────────────────────
// Owns all authentication state, session management, and Supabase access.
//
// callbacks (required):
//   setProfile, setLang, setFilters, setOpportunities, setStep — App state setters
//   DEFAULT_FILTERS — default filter array for sign-out reset
//
// Returns auth state + functions needed by App and scoring.

export function useAuth({ setProfile, setLang, setFilters, setOpportunities, setStep, DEFAULT_FILTERS }) {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [userTier, setUserTier] = useState("free");
  const [devTierOverride, setDevTierOverride] = useState(null); // DEV ONLY — never persisted
  const loadCallRef = useRef(0); // incremented on each loadUserData call; stale calls abort on mismatch

  // ── Supabase helper ─────────────────────────────────────────────────────
  // tokenOverride: pass explicitly when calling before authUser state has settled
  // (e.g. immediately after setAuthUser — React state updates are async).
  async function dbCall(action, payload, timeoutMs = 15000, tokenOverride) {
    const secret = tokenOverride ?? authUser?.sessionToken ?? "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINTS.supabase, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({ ...payload, sessionToken: secret }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`DB error ${res.status}`);
      return res.json();
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Request timed out. Check your connection and try again.");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Load user data from Supabase after sign-in ───────────────────────────
  async function loadUserData(appleId, sessionToken) {
    const callId = ++loadCallRef.current;
    try {
      // Pass sessionToken explicitly — authUser state may not yet reflect the
      // just-completed sign-in when this is called immediately after setAuthUser().
      const result = await dbCall("load", { action: "load", appleId }, 15000, sessionToken);
      if (callId !== loadCallRef.current) return; // stale — a sign-out or newer sign-in superseded this call

      const { profile: savedProfile, filters: savedFilters, opportunities: savedOpps } = result.data;

      if (savedProfile) {
        setProfile({
          name: savedProfile.display_name || "",
          currentTitle: savedProfile.current_title || "",
          background: savedProfile.background || "",
          careerGoal: savedProfile.career_goal || "",
          targetRoles: savedProfile.target_roles || [],
          targetIndustries: savedProfile.target_industries || [],
          compensationMin: savedProfile.compensation_min?.toString() || "",
          compensationTarget: savedProfile.compensation_target?.toString() || "",
          locationPrefs: savedProfile.location_prefs || [],
          hardConstraints: savedProfile.hard_constraints || "",
          threshold: savedProfile.threshold || 3.5,
        });
        if (savedProfile.lang) setLang(savedProfile.lang);
        if (savedProfile.tier) setUserTier(savedProfile.tier);
      }

      if (savedFilters?.length) {
        setFilters(savedFilters.map(f => ({
          id: f.filter_id,
          name: f.name,
          description: f.description,
          weight: f.weight,
          isCore: f.is_core,
        })));
      }

      if (savedOpps?.length) {
        setOpportunities(savedOpps.map(o => ({
          ...o,
          filter_scores: o.filter_scores || [],
          strengths: o.strengths || [],
          gaps: o.gaps || [],
        })));
        setStep("workspace");
      } else if (savedProfile) {
        setStep("workspace");
      } else {
        // Fresh user — no saved data found; send to onboarding
        setStep("onboard");
      }

    } catch (err) {
      if (callId !== loadCallRef.current) return;
      handleError(err, "load_user_data");
      // 403 = session token invalid (secret rotated or token corrupted).
      // Clear stale credentials so the user gets a clean sign-in prompt
      // rather than a blank profile form.
      if (err?.message?.includes("403")) {
        localStorage.removeItem("vetted_session_token");
        sessionStorage.removeItem("vetted_session_token");
        localStorage.removeItem("vetted_user");
        setAuthUser(null);
        setAuthError("Session expired — please sign in again.");
        setStep("onboard");
      } else {
        // Network/server error — drop to onboarding, user can still use app
        setStep("onboard");
      }
    }
  }

  // ── GitHub OAuth callback handler ────────────────────────────────────────
  // After GitHub redirects back, the URL fragment is either:
  //   #gh_auth?gh_user_id=...   (success)
  //   #gh_auth_error?reason=... (failure — GitHub denied, token exchange error, etc.)
  // Parse on mount, sign the user in (or show error), then clean the fragment.
  useEffect(() => {
    const hash = window.location.hash;

    // Error path
    if (hash.startsWith("#gh_auth_error?")) {
      const params = new URLSearchParams(hash.slice("#gh_auth_error?".length));
      const reason = params.get("reason") || "unknown";
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setAuthError(
        reason === "github_denied"
          ? "GitHub sign-in was cancelled."
          : "GitHub sign-in failed. Please try again."
      );
      return;
    }

    if (!hash.startsWith("#gh_auth?")) return;

    const params = new URLSearchParams(hash.slice("#gh_auth?".length));
    const userId  = params.get("gh_user_id");
    const name    = params.get("gh_name") || "User";
    const email   = params.get("gh_email") || "";
    const token   = params.get("gh_token") || "";

    if (!userId || !token) return;

    // Clean the fragment immediately so it doesn't linger in browser history
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const user = { id: userId, email, displayName: name, sessionToken: token };
    const { sessionToken: _st, ...toStore } = user;
    localStorage.setItem("vetted_user", JSON.stringify(toStore));
    localStorage.setItem("vetted_session_token", token);
    sessionStorage.setItem("vetted_session_token", token);
    setAuthUser(user);
    loadUserData(userId, token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore auth from localStorage on mount ──────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem("vetted_user");
        if (stored) {
          const user = JSON.parse(stored);
          if (user?.id) {
            // sessionStorage is cleared on cold relaunch on iOS — fall back to localStorage.
            // The session token is HMAC(VETTED_SECRET, appleId); storing it in localStorage
            // is equivalent to any persistent auth credential and is sandboxed to the app.
            const restoredToken =
              sessionStorage.getItem("vetted_session_token") ||
              localStorage.getItem("vetted_session_token") || "";
            setAuthUser({ ...user, sessionToken: restoredToken });
            // DEV PREVIEW: skip live fetch if vetted_preview_mode is set in localStorage
            if (localStorage.getItem("vetted_preview_mode")) {
              setUserTier(localStorage.getItem("vetted_preview_tier") || "signal");
              setStep("workspace");
              return;
            }
            const result = await fetch(ENDPOINTS.supabase, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Vetted-Token": restoredToken },
              body: JSON.stringify({ action: "load", appleId: user.id, sessionToken: restoredToken })
            });
            if (result.status === 403) {
              // Token is stale (secret rotated) — clear it and show sign-in
              localStorage.removeItem("vetted_session_token");
              sessionStorage.removeItem("vetted_session_token");
              localStorage.removeItem("vetted_user");
              setAuthUser(null);
              setAuthError("Session expired — please sign in again.");
              return;
            }
            if (result.ok) {
              const data = await result.json();
              const saved = data.data;
              if (saved?.profile?.display_name && saved.profile.display_name !== "User") {
                // Use functional update to preserve sessionToken — user from localStorage
                // does NOT have sessionToken (it is stripped before storage).
                setAuthUser(prev => {
                  const updated = { ...prev, displayName: saved.profile.display_name };
                  const { sessionToken: _st, ...toStore } = updated;
                  localStorage.setItem("vetted_user", JSON.stringify(toStore));
                  return updated;
                });
              }
              if (saved?.profile) {
                const p = saved.profile;
                setProfile(prev => ({ ...prev,
                  name: p.display_name || prev.name,
                  background: p.background || prev.background,
                  careerGoal: p.career_goal || prev.careerGoal,
                  currentTitle: p.current_title || prev.currentTitle,
                  targetRoles: p.target_roles || prev.targetRoles,
                  targetIndustries: p.target_industries || prev.targetIndustries,
                  location: p.location_prefs?.[0] || prev.location,
                  compMin: p.compensation_min?.toString() || prev.compMin,
                  compMax: p.compensation_target?.toString() || prev.compMax,
                  threshold: p.threshold || prev.threshold,
                }));
                if (p.tier) setUserTier(p.tier);
              }
              if (saved?.filters?.length) {
                setFilters(saved.filters.map(f => ({ id: f.filter_id, name: f.name, description: f.description, weight: f.weight, isCore: f.is_core })));
              }
              if (saved?.opportunities?.length) {
                setOpportunities(saved.opportunities.map(o => ({
                  ...o,
                  filter_scores: o.filter_scores || [],
                  strengths: o.strengths || [],
                  gaps: o.gaps || [],
                })));
              }
              if (saved?.profile) {
                setStep("workspace");
              } else {
                setStep("onboard");
              }
            }
          }
        }
      } catch (e) {
        console.warn("[restoreSession]", e?.message);
        // Network may not be ready yet on warm launch — don't clear auth state,
        // just leave the member where they are. They can retry manually.
      }
    }
    restoreSession();

    // ── Warm launch recovery ─────────────────────────────────────────────────
    // iOS sometimes reloads the WebView on foreground under memory pressure.
    // Solution: listen for appStateChange (foreground) and re-run restoreSession
    // with a short delay to let the network stabilize.
    let warmLaunchHandler = null;
    if (window.Capacitor?.isNativePlatform?.()) {
      warmLaunchHandler = window.Capacitor?.Plugins?.App?.addListener?.(
        "appStateChange",
        (state) => {
          if (state?.isActive) {
            const stored = localStorage.getItem("vetted_user");
            if (stored) {
              setTimeout(() => restoreSession(), 1200);
            }
          }
        }
      );
    }

    return () => {
      warmLaunchHandler?.remove?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign in with Apple ───────────────────────────────────────────────────
  async function handleSignInWithApple() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        const plugin = window.Capacitor?.Plugins?.SignInWithApplePlugin;
        if (!plugin) {
          const bridgeErr = new Error("SignInWithApplePlugin not registered in Capacitor bridge");
          handleError(bridgeErr, "apple_sign_in_bridge");
          throw bridgeErr;
        }
        const result = await plugin.authorize();

        if (result.error) throw new Error(result.message || "Sign in failed");
        const { identityToken, givenName, familyName } = result.response;

        // Verify token server-side
        const res = await fetch(ENDPOINTS.appleAuth, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identityToken,
            fullName: { givenName, familyName },
          }),
        });

        if (!res.ok) throw new Error("Server verification failed");
        const data = await res.json();

        const resolvedName = givenName || data.user.displayName || "";
        const user = {
          id: data.user.id,
          email: data.user.email,
          displayName: resolvedName || "User",
          sessionToken: data.sessionToken || "",
        };

        const { sessionToken: _st1, ...userToStore } = user;
        localStorage.setItem("vetted_user", JSON.stringify(userToStore));
        // sessionStorage is cleared on iOS cold relaunch — also persist in localStorage
        // so profile loads without forcing re-auth every time the app is fully closed.
        localStorage.setItem("vetted_session_token", user.sessionToken);
        sessionStorage.setItem("vetted_session_token", user.sessionToken);
        setAuthUser(user);

        // Load all saved data from Supabase
        await loadUserData(user.id, user.sessionToken);

        if (resolvedName) {
          setProfile(p => ({ ...p, name: p.name || resolvedName }));
          const updatedUser = { ...user, displayName: resolvedName };
          const { sessionToken: _st2, ...updatedUserToStore } = updatedUser;
          localStorage.setItem("vetted_user", JSON.stringify(updatedUserToStore));
          setAuthUser(updatedUser);
        }

      } else {
        // Web preview — show helpful message instead of failing silently
        setAuthError("Sign in with Apple requires the iOS app. To test on web, use the Netlify preview with a supported browser on a Mac or iPhone.");
      }
    } catch (err) {
      handleError(err, "apple_sign_in");
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("cancelled") || msg.includes("canceled")) {
        setAuthError("cancelled");
      } else if (msg.includes("not registered") || msg.includes("bridge") || msg.includes("plugin")) {
        setAuthError("bridge_error");
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout")) {
        setAuthError("network_error");
      } else if (msg.includes("server") || msg.includes("verification") || msg.includes("403")) {
        setAuthError("server_error");
      } else {
        setAuthError("unknown_error");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Sign in with GitHub (web only) ──────────────────────────────────────
  // Redirects to the Netlify github-auth function which starts the OAuth flow.
  function handleSignInWithGitHub() {
    window.location.href = ENDPOINTS.githubAuth;
  }

  // Clear all auth state — gives members a clean retry without reinstalling
  function clearAuthState() {
    localStorage.removeItem("vetted_user");
    localStorage.removeItem("vetted_session_token");
    sessionStorage.removeItem("vetted_session_token");
    setAuthUser(null);
    setAuthError("");
  }

  function handleSignOut() {
    loadCallRef.current++; // invalidate any in-flight loadUserData
    setAuthError("");
    localStorage.removeItem("vetted_user");
    localStorage.removeItem("vetted_session_token");
    sessionStorage.removeItem("vetted_session_token");
    setAuthUser(null);
    setStep("onboard");
    setOpportunities([]);
    setProfile({
      name: "", currentTitle: "", background: "", targetRoles: [], targetIndustries: [],
      compensationMin: "", compensationTarget: "", locationPrefs: [], hardConstraints: "",
      careerGoal: "", threshold: 3.5,
    });
    setFilters(DEFAULT_FILTERS);
  }

  return {
    authUser,
    authLoading,
    authError,
    setAuthError,
    userTier,
    setUserTier,
    devTierOverride,
    setDevTierOverride,
    handleSignInWithApple,
    handleSignInWithGitHub,
    handleSignOut,
    clearAuthState,
    dbCall,
  };
}
