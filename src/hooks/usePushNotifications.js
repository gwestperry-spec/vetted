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
