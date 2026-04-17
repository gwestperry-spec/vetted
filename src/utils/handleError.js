import { Sentry } from "../sentry.js";

/**
 * Centralized error handler — logs to console and reports to Sentry.
 * Use in every catch block instead of raw console.error + Sentry.captureException.
 *
 * @param {unknown} err
 * @param {string}  location  — a stable identifier, e.g. "load_user_data"
 */
export function handleError(err, location) {
  const error = err instanceof Error ? err : new Error(String(err ?? "Unknown error"));
  console.error(`[${location}]`, error.message);
  Sentry.captureException(error, { tags: { location } });
}
