import { useState, useCallback, useRef, useId } from "react";
import { ENDPOINTS } from "../config.js";
import LangSwitcher from "./LangSwitcher.jsx";
import { sanitizeText, MAX_SHORT, MAX_LONG } from "../utils/sanitize.js";
import CoachMark from "./CoachMark.jsx";

const NA_COUNTRIES = [
  { code: "us", flag: "🇺🇸" },
  { code: "ca", flag: "🇨🇦" },
  { code: "mx", flag: "🇲🇽" },
];

// ─── TagInput ─────────────────────────────────────────────────────────────
function TagInput({ labelText, labelId, placeholder, tags, onAddTag, onRemoveTag, removeLabel, hint }) {
  const [inputVal, setInputVal] = useState("");
  const inputId = useId();

  function commit() {
    const v = inputVal.trim();
    if (v) { onAddTag(v); setInputVal(""); }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
  }

  return (
    <div className="field">
      <label id={labelId} htmlFor={inputId}>{labelText}</label>
      <p className="hint">{hint}</p>
      <input
        id={inputId}
        aria-labelledby={labelId}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={placeholder}
      />
      <div className="tags" role="list" aria-label={labelText}>
        {tags.map((tag, i) => (
          <span key={i} className="tag" role="listitem">
            {tag}
            <button className="tag-remove" onClick={() => onRemoveTag(i)} aria-label={`${removeLabel} ${tag}`}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── RegionGate ───────────────────────────────────────────────────────────
export function RegionGate({ t, lang, setLang, selectedCountry, setSelectedCountry, onContinue }) {
  return (
    <div className="region-gate">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p className="header-eyebrow">{t.appEyebrow}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "#1A2E1A", marginBottom: 8 }}>
          {t.appTitle1}<span style={{ color: "var(--accent)" }}>{t.appTitleAccent}</span>{t.appTitle2}
        </h1>
      </div>
      <LangSwitcher lang={lang} setLang={setLang} />
      <div className="card" role="region" aria-labelledby="region-title">
        <h2 className="card-title" id="region-title">{t.regionTitle}</h2>
        <p className="card-subtitle">{t.regionSubtitle}</p>
        <div role="group" aria-label={t.regionTitle}>
          {NA_COUNTRIES.map(c => (
            <button key={c.code} className="country-option" aria-pressed={selectedCountry === c.code} onClick={() => setSelectedCountry(c.code)}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>{c.flag}</span>
              <span>{t.countries[c.code]}</span>
            </button>
          ))}
        </div>
        <div className="btn-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={!selectedCountry} aria-disabled={!selectedCountry} onClick={onContinue} style={{ width: "100%" }}>
            {t.regionContinue}
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ─── OnboardStep ──────────────────────────────────────────────────────────
export function OnboardStep({ t, profile, setProfile, onNext, userTier, onUpgrade, authUser }) {
  const nameId = useId(); const titleId = useId(); const bgId = useId();
  const goalId = useId(); const compMinId = useId(); const compTargetId = useId();
  const constraintsId = useId(); const thresholdId = useId();

  const up = useCallback((patch) => setProfile(p => ({ ...p, ...patch })), [setProfile]);

  const addTag = useCallback((field) => (value) => {
    const clean = sanitizeText(value);
    if (clean) up({ [field]: [...(profile[field] || []), clean] });
  }, [profile, up]);

  const removeTag = useCallback((field) => (i) => {
    up({ [field]: profile[field].filter((_, idx) => idx !== i) });
  }, [profile, up]);

  const valid = profile.name && profile.background && profile.careerGoal;
  const isVantageUser = userTier === "vantage" || userTier === "vantage_lifetime";

  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeStatus, setResumeStatus] = useState(""); // "success" | "error" | ""
  const fileInputRef = useRef(null);

  async function extractTextFromFile(file) {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "txt") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result || "");
        reader.onerror = () => reject(new Error("read_error"));
        reader.readAsText(file);
      });
    }

    if (ext === "pdf") {
      // Load PDF.js from CDN lazily — only when a PDF is actually selected
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("pdfjs_load_failed"));
          document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const buffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(" "));
      }
      return pages.join("\n");
    }

    throw new Error("unsupported_type");
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected if needed
    e.target.value = "";

    if (!isVantageUser) { onUpgrade?.(t?.paywallResume || "Upload your resume to auto-fill your profile and sharpen every score. Signal feature."); return; }

    setResumeLoading(true);
    setResumeStatus("");
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error("empty_text");

      const res = await fetch(ENDPOINTS.parseResume, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": authUser?.sessionToken || "" },
        body: JSON.stringify({ resumeText: text, appleId: authUser?.id, sessionToken: authUser?.sessionToken || "" }),
      });
      if (!res.ok) throw new Error("server_error");
      const { profile: parsed } = await res.json();

      // Merge parsed fields — only overwrite empty fields so manual edits aren't clobbered
      up({
        name:               parsed.name               || profile.name,
        currentTitle:       parsed.currentTitle       || profile.currentTitle,
        background:         parsed.background         || profile.background,
        careerGoal:         parsed.careerGoal         || profile.careerGoal,
        targetRoles:        parsed.targetRoles?.length   ? parsed.targetRoles   : profile.targetRoles,
        targetIndustries:   parsed.targetIndustries?.length ? parsed.targetIndustries : profile.targetIndustries,
        compensationMin:    parsed.compensationMin    || profile.compensationMin,
        compensationTarget: parsed.compensationTarget || profile.compensationTarget,
        locationPrefs:      parsed.locationPrefs?.length    ? parsed.locationPrefs    : profile.locationPrefs,
        hardConstraints:    parsed.hardConstraints    || profile.hardConstraints,
      });
      setResumeStatus("success");
    } catch {
      setResumeStatus("error");
    } finally {
      setResumeLoading(false);
    }
  }

  return (
    <section aria-labelledby="profile-heading">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* ── Dark hero banner ── */}
        <div style={{ background: "#1A2E1A", padding: "22px 28px 20px", borderRadius: "11px 11px 0 0" }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 10 }}>
            STEP 1 OF 3
          </p>
          <h2 id="profile-heading" style={{ fontFamily: "var(--font-display)", fontStyle: "normal", fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.1, margin: 0, marginBottom: 6 }}>
            {t.profileTitle}
          </h2>
          <p style={{ fontFamily: "var(--font-prose)", fontStyle: "normal", fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.5, margin: 0 }}>
            {t.profileSubtitle}
          </p>
        </div>

        {/* ── Card body ── */}
        <div style={{ padding: "24px 28px 28px" }}>
        <CoachMark
          storageKey="vetted_cm_profile"
          title={t.cmProfileTitle}
          body={t.cmProfileBody}
          dir={t.dir}
        />

        {/* ── Resume upload (Vantage) ── */}
        <div style={{ marginBottom: 20, padding: "14px 16px", background: "var(--cream)", borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{t.resumeUpload}</p>
            <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)" }}>{t.resumeHint}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {resumeStatus === "success" && (
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>✓ {t.resumeSuccess}</span>
            )}
            {resumeStatus === "error" && (
              <span style={{ fontSize: 12, color: "var(--pass)" }}>{t.resumeError}</span>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleResumeUpload} style={{ display: "none" }} aria-label={t.resumeUpload} />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => isVantageUser ? fileInputRef.current?.click() : onUpgrade?.(t?.paywallResume || "Upload your resume to auto-fill your profile and sharpen every score. Signal feature.")}
              disabled={resumeLoading}
              style={{ minWidth: 120 }}
            >
              {resumeLoading
                ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} aria-hidden="true" /> {t.resumeUploading}</>
                : isVantageUser ? t.resumeUpload : "🔒 " + t.resumeUpload}
            </button>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor={nameId}>{t.labelName}</label>
            <input id={nameId} value={profile.name} onChange={e => up({ name: e.target.value })} placeholder={t.placeholderName} autoComplete="given-name" maxLength={MAX_SHORT} aria-required="true" aria-invalid={!profile.name} />
          </div>
          <div className="field">
            <label htmlFor={titleId}>{t.labelCurrentTitle}</label>
            <input id={titleId} value={profile.currentTitle} onChange={e => up({ currentTitle: e.target.value })} placeholder={t.placeholderTitle} maxLength={MAX_SHORT} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={bgId}>{t.labelBackground}</label>
          <textarea id={bgId} value={profile.background} onChange={e => up({ background: e.target.value })} placeholder={t.placeholderBackground} style={{ minHeight: 120 }} maxLength={MAX_LONG} aria-required="true" aria-invalid={!profile.background} />
        </div>
        <div className="field">
          <label htmlFor={goalId}>{t.labelCareerGoal}</label>
          <input id={goalId} value={profile.careerGoal} onChange={e => up({ careerGoal: e.target.value })} placeholder={t.placeholderGoal} maxLength={MAX_SHORT} aria-required="true" aria-invalid={!profile.careerGoal} />
        </div>

        <TagInput labelText={t.labelTargetRoles} labelId="roles-label" placeholder={t.placeholderRoles} tags={profile.targetRoles} onAddTag={addTag("targetRoles")} onRemoveTag={removeTag("targetRoles")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />
        <TagInput labelText={t.labelTargetIndustries} labelId="industries-label" placeholder={t.placeholderIndustries} tags={profile.targetIndustries} onAddTag={addTag("targetIndustries")} onRemoveTag={removeTag("targetIndustries")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />

        <div className="field-row">
          <div className="field">
            <label htmlFor={compMinId}>{t.labelCompMin}</label>
            <input id={compMinId} type="number" inputMode="numeric" value={profile.compensationMin} onChange={e => up({ compensationMin: e.target.value })} placeholder={t.placeholderCompMin} min="0" max="10000000" />
          </div>
          <div className="field">
            <label htmlFor={compTargetId}>{t.labelCompTarget}</label>
            <input id={compTargetId} type="number" inputMode="numeric" value={profile.compensationTarget} onChange={e => up({ compensationTarget: e.target.value })} placeholder={t.placeholderCompTarget} min="0" max="10000000" />
          </div>
        </div>

        <TagInput labelText={t.labelLocations} labelId="locations-label" placeholder={t.placeholderLocations} tags={profile.locationPrefs} onAddTag={addTag("locationPrefs")} onRemoveTag={removeTag("locationPrefs")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />

        <div className="field">
          <label htmlFor={constraintsId}>{t.labelConstraints}</label>
          <input id={constraintsId} value={profile.hardConstraints} onChange={e => up({ hardConstraints: e.target.value })} placeholder={t.placeholderConstraints} maxLength={MAX_LONG} />
        </div>
        <div className="field">
          <label htmlFor={thresholdId}>{t.labelThreshold}</label>
          <select id={thresholdId} value={profile.threshold} onChange={e => up({ threshold: parseFloat(e.target.value) })}>
            {t.thresholdOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="btn-actions">
          <button className="btn btn-primary" onClick={onNext} disabled={!valid} aria-disabled={!valid}>{t.btnBuildFramework}</button>
        </div>
        </div>{/* end card body */}
      </div>
    </section>
  );
}
