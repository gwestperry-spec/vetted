// ── usePushNotifications.js ───────────────────────────────────────────────
// Registers for APNs push notifications via @capacitor/push-notifications.
// Stores the device token server-side so we can send targeted pushes later.
//
// Asks for permission only after sign-in — never on cold launch.
// Safe on web (Capacitor gracefully no-ops non-native APIs in the browser).

import { useEffect, useRef } from "react";
import { ENDPOINTS } from "../config.js";

// Lazy-load Capacitor plugin — avoids breaking web builds
async function getPushPlugin() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return PushNotifications;
  } catch {
    return null;
  }
}

const NOTIF_PREFS_KEY = "vetted_notif_prefs";
function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}"); } catch { return {}; }
}

export function usePushNotifications({ authUser, lang, enabled, onOpenRole }) {
  const registered = useRef(false);
  const lastLang   = useRef(null);

  // Exposed manual trigger — lets a debug button in the UI force re-registration
  // when the original automatic call didn't fire (e.g. permission denied first
  // time, then later approved in iOS Settings).
  if (typeof window !== "undefined") {
    window.__vettedForceRegisterPush = async () => {
      const Push = await getPushPlugin();
      if (!Push) return { ok: false, stage: "plugin_unavailable", note: "Capacitor push plugin not present (web build, not iOS)." };

      // Stage 1: permission with hard timeout (in case requestPermissions hangs)
      let perm;
      try {
        perm = await Promise.race([
          Push.requestPermissions(),
          new Promise((resolve) => setTimeout(() => resolve({ receive: "timeout" }), 4000)),
        ]);
      } catch (e) {
        return { ok: false, stage: "requestPermissions_threw", note: e.message };
      }
      if (perm.receive === "timeout") {
        return { ok: false, stage: "permission_check_hung", note: "Push.requestPermissions() didn't resolve in 4s. The plugin may be in a bad state. Force-quit Vetted, reopen, retry." };
      }
      if (perm.receive !== "granted") {
        return { ok: false, stage: "perm_not_granted", note: `iOS permission: ${perm.receive}. Open iOS Settings → Vetted → Notifications → Allow Notifications.` };
      }

      // Stage 2: attach listeners + register, with bulletproof outer timeout
      const result = await new Promise((resolve) => {
        const finish = (payload) => { try { resolve(payload); } catch {} };
        let tokenHandle = null, errHandle = null;

        const timer = setTimeout(() => {
          finish({ ok: false, stage: "no_token_after_8s", note: "Push.register() ran but APNs didn't return a token within 8s. Likely entitlement mismatch (aps-environment=production but signed for development, or vice versa) or bundle ID doesn't match the APNs key." });
        }, 8000);

        // Attach listeners then call register. Use .then so failures here can't hang.
        Push.addListener("registration", ({ value: token }) => {
          clearTimeout(timer);
          fetch(window.__VETTED_REGISTER_DEVICE_URL || "/.netlify/functions/register-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appleId:      window.__VETTED_APPLE_ID,
              sessionToken: window.__VETTED_SESSION_TOKEN,
              token,
              platform:     "ios",
              lang:         window.__VETTED_LANG || "en",
              prefs:        {},
            }),
          })
            .then(async (res) => {
              const txt = await res.text().catch(() => "");
              if (!res.ok) finish({ ok: false, stage: "register_device_failed", note: `register-device ${res.status}: ${txt.slice(0, 200)}` });
              else finish({ ok: true, stage: "registered", note: `Token ${token.slice(-8)} stored.` });
            })
            .catch((e) => finish({ ok: false, stage: "register_device_threw", note: e.message }));
        }).then((h) => { tokenHandle = h; });

        Push.addListener("registrationError", (err) => {
          clearTimeout(timer);
          finish({ ok: false, stage: "registrationError", note: err?.error || JSON.stringify(err) });
        }).then((h) => { errHandle = h; });

        registered.current = false;
        Push.register().catch((e) => {
          clearTimeout(timer);
          finish({ ok: false, stage: "register_threw", note: e.message });
        });
      });

      return result;
    };
  }

  useEffect(() => {
    if (!authUser?.id || !enabled || registered.current) return;

    let mounted = true;

    async function register() {
      const Push = await getPushPlugin();
      if (!Push) return; // web — skip

      // Check / request permission
      const permResult = await Push.requestPermissions();
      if (permResult.receive !== "granted") return;

      // Listen for token (fires once after registration)
      const tokenListener = await Push.addListener("registration", async ({ value: token }) => {
        if (!mounted || !token) return;
        registered.current = true;

        try {
          const prefs = getNotifPrefs();
          lastLang.current = lang || "en";
          await fetch(ENDPOINTS.registerDevice, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appleId:      authUser.id,
              sessionToken: authUser.sessionToken || "",
              token,
              platform:     "ios",
              lang:         lang || "en",
              prefs,
            }),
          });
        } catch (err) {
          console.warn("[push] failed to register device token:", err);
        }
      });

      // Listen for errors
      const errListener = await Push.addListener("registrationError", (err) => {
        console.warn("[push] registration error:", err);
      });

      // Listen for foreground notifications (show as in-app banner or ignore)
      const fgListener = await Push.addListener("pushNotificationReceived", (notification) => {
        // App is in foreground — notification delivered silently; no-op for now
        console.log("[push] foreground notification:", notification.title);
      });

      // Deep-link handler — notification tapped while app is open or from cold launch
      const tapListener = await Push.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data || {};
        if (data.roleId && onOpenRole) {
          onOpenRole(data.roleId);
        }
      });

      await Push.register();

      return () => {
        tokenListener.remove();
        errListener.remove();
        fgListener.remove();
        tapListener.remove();
      };
    }

    const cleanup = register();
    return () => {
      mounted = false;
      cleanup.then(fn => fn?.());
    };
  }, [authUser?.id, enabled]);

  // When lang changes after registration, patch the server with updated preference
  useEffect(() => {
    if (!authUser?.id || !lang || !registered.current) return;
    if (lastLang.current === lang) return;
    lastLang.current = lang;
    fetch(ENDPOINTS.registerDevice, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appleId: authUser.id,
        lang,
        langUpdateOnly: true,
      }),
    }).catch(() => {});
  }, [lang, authUser?.id]);
}
