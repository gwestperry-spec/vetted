import { useState, useId } from "react";

const MAX_JD = 12000;
const MAX_URL = 2048;

function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, MAX_URL);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.startsWith("172.16.") || host.endsWith(".internal") ||
      host === "metadata.google.internal") return "";
    return trimmed;
  } catch { return ""; }
}

export default function OpportunityForm({ t, onScore, loading, error }) {
  const [jd, setJd] = useState("");
  const [tabMode, setTabMode] = useState("paste");
  const [urlVal, setUrlVal] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const jdId = useId(); const urlId = useId();

  async function handleUrlFetch() {
    const safeUrl = sanitizeUrl(urlVal);
    if (!safeUrl) { setFetchError(t.urlFetchError); return; }
    setFetching(true); setFetchError("");
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(safeUrl)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.contents) throw new Error();
      const stripped = data.contents
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      if (stripped.length < 100) throw new Error();
      setJd(stripped); setTabMode("paste");
    } catch { setFetchError(t.urlFetchError); }
    finally { setFetching(false); }
  }

  return (
    <div className="card">
      <h2 className="card-title">{t.submitTitle}</h2>
      <p className="card-subtitle">{t.submitSubtitle}</p>
      <div role="tablist" className="tabs">
        <button role="tab" className="tab-btn" aria-selected={tabMode === "paste"} aria-controls="panel-paste" id="tab-paste" onClick={() => setTabMode("paste")}>{t.tabPaste}</button>
      </div>
      {tabMode === "paste" ? (
        <div role="tabpanel" id="panel-paste" aria-labelledby="tab-paste">
          <div className="field">
            <label htmlFor={jdId}>{t.labelJD}</label>
            <textarea id={jdId} value={jd} onChange={e => setJd(e.target.value)} placeholder={t.placeholderJD} style={{ minHeight: 200 }} maxLength={MAX_JD} />
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="panel-url" aria-labelledby="tab-url">
          <div className="field">
            <label htmlFor={urlId}>{t.labelUrl}</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input id={urlId} type="url" value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://" style={{ flex: 1 }} maxLength={MAX_URL} />
              <button className="btn btn-secondary" onClick={handleUrlFetch} disabled={!urlVal.trim() || fetching} aria-busy={fetching}>{fetching ? t.btnFetching : t.btnFetch}</button>
            </div>
            {fetchError && <div role="alert" className="alert alert-warn" style={{ marginTop: 12 }}>{fetchError}</div>}
            <p className="url-note">{t.urlNote}</p>
            {jd && tabMode === "url" && <p style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }} aria-live="polite">✓ {jd.length.toLocaleString()} {t.fetchedText}</p>}
          </div>
        </div>
      )}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <div className="btn-actions">
        <button className="btn btn-primary" onClick={() => onScore(jd)} disabled={!jd.trim() || loading} aria-busy={loading}>
          {loading ? t.btnScoring : t.btnScore}
        </button>
      </div>
    </div>
  );
}
