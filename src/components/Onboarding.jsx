import { useState, useRef, useEffect } from "react";
import { ENDPOINTS } from "../config.js";
import LangSwitcher from "./LangSwitcher.jsx";
import { sanitizeText, MAX_SHORT, MAX_LONG } from "../utils/sanitize.js";
import { COUNTRIES, POPULAR_CODES, COUNTRY_MAP } from "../data/countries.js";


// ─── Step definitions ─────────────────────────────────────────────────────
function buildSteps(t) {
  return [
    { id: "name",               field: "name",               kind: "text",      required: true,
      prompt: t.labelName,                  sub: t.placeholderName,            placeholder: t.placeholderName },
    { id: "currentTitle",       field: "currentTitle",       kind: "text",      required: false,
      prompt: t.labelCurrentTitle,          sub: null,                         placeholder: t.placeholderTitle },
    { id: "background",         field: "background",         kind: "textarea",  required: true,
      prompt: t.labelBackground,            sub: null,                         placeholder: t.placeholderBackground },
    { id: "careerGoal",         field: "careerGoal",         kind: "text",      required: true,
      prompt: t.labelCareerGoal,            sub: null,                         placeholder: t.placeholderGoal },
    { id: "targetRoles",        field: "targetRoles",        kind: "tags",      required: false,
      prompt: t.labelTargetRoles,           sub: t.addTagHint,                 placeholder: t.placeholderRoles },
    { id: "targetIndustries",   field: "targetIndustries",   kind: "tags",      required: false,
      prompt: t.labelTargetIndustries,      sub: t.addTagHint,                 placeholder: t.placeholderIndustries },
    { id: "compensationMin",    field: "compensationMin",    kind: "money",     required: false,
      prompt: t.labelCompMin,               sub: null,                         placeholder: t.placeholderCompMin || "230" },
    { id: "compensationTarget", field: "compensationTarget", kind: "money",     required: false,
      prompt: t.labelCompTarget,            sub: null,                         placeholder: t.placeholderCompTarget || "300" },
    { id: "country",            field: "country",            kind: "country",   required: false,
      prompt: t.labelCountry || "Where are you based?",
      sub:    t.subCountry   || "Sets your market context for salary and demand data.",
      canSkip: true },
    { id: "locationPrefs",      field: "locationPrefs",      kind: "tags",      required: false,
      prompt: t.labelLocations,             sub: t.addTagHint,                 placeholder: t.placeholderLocations,
      canSkip: true },
    { id: "hardConstraints",    field: "hardConstraints",    kind: "text",      required: false,
      prompt: t.labelConstraints,           sub: null,                         placeholder: t.placeholderConstraints,
      canSkip: true },
    { id: "threshold",          field: "threshold",          kind: "threshold", required: false,
      prompt: t.labelThreshold,             sub: null },
    { id: "timeline",           field: "timeline",           kind: "choice",    required: false,
      prompt: t.labelTimeline || "When do you want to land?", sub: null,
      options: t.timelineOptions, canSkip: true },
  ];
}

// ─── OnboardStep ──────────────────────────────────────────────────────────
export function OnboardStep({ t, profile, setProfile, onNext, userTier, onUpgrade, authUser, currency, isEditing, onDone }) {
  const steps = buildSteps(t);
  const [idx, setIdx]             = useState(0);
  const [direction, setDirection] = useState("next");

  const isVantageUser = userTier === "vantage" || userTier === "vantage_lifetime";
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeStatus, setResumeStatus]   = useState("");
  const fileInputRef = useRef(null);

  const step  = steps[idx];
  const total = steps.length;
  const value = profile[step.field] ?? (step.kind === "tags" ? [] : "");

  const isFilled = (() => {
    if (!step.required) return true;
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" ? value.trim().length > 0 : value != null;
  })();

  function set(v) {
    if (step.kind === "country") {
      const c = COUNTRY_MAP[v];
      setProfile(p => ({ ...p, country: v, currency: c?.currency || "USD" }));
    } else {
      setProfile(p => ({ ...p, [step.field]: v }));
    }
  }

  function goNext() {
    if (idx === total - 1) { isEditing && onDone ? onDone() : onNext(); return; }
    setDirection("next");
    setIdx(i => i + 1);
  }

  function goBack() {
    if (idx === 0) { if (isEditing && onDone) onDone(); return; }
    setDirection("back");
    setIdx(i => i - 1);
  }

  // Resume upload
  async function extractTextFromFile(file) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result || "");
        reader.onerror = () => reject(new Error("read_error"));
        reader.readAsText(file);
      });
    }
    if (ext === "pdf") {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          s.onload = resolve; s.onerror = () => reject(new Error("pdfjs_load_failed"));
          document.head.appendChild(s);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const buffer = await file.arrayBuffer();
      const pdf    = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      const pages  = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
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
    e.target.value = "";
    if (!isVantageUser) { onUpgrade?.(t?.paywallResume || "Upload your resume to auto-fill your profile. Vantage feature."); return; }
    setResumeLoading(true); setResumeStatus("");
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
      setProfile(p => ({
        ...p,
        name:               parsed.name               || p.name,
        currentTitle:       parsed.currentTitle       || p.currentTitle,
        background:         parsed.background         || p.background,
        careerGoal:         parsed.careerGoal         || p.careerGoal,
        targetRoles:        parsed.targetRoles?.length    ? parsed.targetRoles    : p.targetRoles,
        targetIndustries:   parsed.targetIndustries?.length ? parsed.targetIndustries : p.targetIndustries,
        compensationMin:    parsed.compensationMin    || p.compensationMin,
        compensationTarget: parsed.compensationTarget || p.compensationTarget,
        locationPrefs:      parsed.locationPrefs?.length  ? parsed.locationPrefs  : p.locationPrefs,
        hardConstraints:    parsed.hardConstraints    || p.hardConstraints,
      }));
      setResumeStatus("success");
    } catch {
      setResumeStatus("error");
    } finally {
      setResumeLoading(false);
    }
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100%", display: "flex", flexDirection: "column" }}>

      {/* Top rail: wordmark + section + step counter */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "54px 20px 0" }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink)", textTransform: "uppercase" }}>
          VETTED
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {isEditing && onDone && (
            <button onClick={onDone} style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.12em",
              color: "var(--muted)", textTransform: "uppercase", padding: "2px 0",
            }}>
              ← PROFILE
            </button>
          )}
          <div style={{ textAlign: "end" }}>
            <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em", color: "#8A9A8A", textTransform: "uppercase" }}>
              {isEditing ? "EDITING" : (t.stepProfile?.toUpperCase() || "PROFILE")}
            </div>
            <div style={{ fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.10em", color: "var(--ink)", textTransform: "uppercase", marginTop: 2 }}>
              {idx + 1} / {total}
            </div>
          </div>
        </div>
      </header>

      {/* Hairline progress bar */}
      <div style={{ margin: "20px 20px 0", height: 1, background: "var(--border)", position: "relative" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, height: 1,
          width: `${((idx + 1) / total) * 100}%`,
          background: "var(--ink)", transition: "width 280ms ease",
        }} />
      </div>

      {/* Resume upload banner (show on background step) */}
      {idx === 2 && (
        <div style={{ margin: "16px 20px 0", padding: "12px 16px", background: "var(--cream)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p style={{ fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink)", margin: 0 }}>{t.resumeUpload}</p>
            <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)", margin: "2px 0 0" }}>{t.resumeHint}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {resumeStatus === "success" && <span style={{ fontSize: 11, color: "var(--accent)" }}>✓ {t.resumeSuccess}</span>}
            {resumeStatus === "error"   && <span style={{ fontSize: 11, color: "var(--error)" }}>{t.resumeError}</span>}
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleResumeUpload} style={{ display: "none" }} />
            <button
              onClick={() => isVantageUser ? fileInputRef.current?.click() : onUpgrade?.(t?.paywallResume)}
              disabled={resumeLoading}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "0.5px solid var(--border)",
                background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
                fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.08em",
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}
            >
              {resumeLoading ? "..." : isVantageUser ? t.resumeUpload : ("🔒 " + t.resumeUpload)}
            </button>
          </div>
        </div>
      )}

      {/* Animated field stage */}
      <div style={{ flex: 1, padding: "40px 20px 16px", overflow: "hidden" }}>
        <FieldCard
          key={step.id}
          step={step}
          value={value}
          onChange={set}
          onSubmit={() => isFilled && goNext()}
          direction={direction}
          t={t}
          currency={currency}
        />
      </div>

      {/* Footer: back / skip / continue */}
      <footer style={{ padding: "0 20px 38px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          onClick={goBack} disabled={idx === 0} aria-label="Back"
          style={{
            width: 52, height: 52, borderRadius: 999,
            background: idx === 0 ? "transparent" : "var(--cream)",
            border: `0.5px solid ${idx === 0 ? "transparent" : "var(--border)"}`,
            cursor: idx === 0 ? "default" : "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: idx === 0 ? "transparent" : "var(--ink)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {step.canSkip && (
            <button onClick={goNext} style={{
              fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.12em",
              color: "#8A9A8A", background: "transparent", border: "none",
              cursor: "pointer", padding: "12px 4px", textTransform: "uppercase",
            }}>SKIP</button>
          )}
          <button
            onClick={goNext} disabled={!isFilled}
            style={{
              minHeight: 52, padding: "0 28px", borderRadius: 999,
              background: isFilled ? "var(--ink)" : "#C8D4C5",
              color: isFilled ? "#F4F8F0" : "rgba(244,248,240,0.6)",
              fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              border: "none", cursor: isFilled ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 10,
              transition: "background 200ms ease",
            }}
          >
            {(idx === total - 1 ? (isEditing ? "Save" : (t.btnBuildFramework || "Finish")) : "Continue").toUpperCase()}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

// ─── Animated field card ──────────────────────────────────────────────────
function FieldCard({ step, value, onChange, onSubmit, direction, t, currency }) {
  const ref = useRef();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = direction === "next" ? "translateX(40px)" : "translateX(-40px)";
    el.style.opacity   = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = "transform 320ms cubic-bezier(.2,.8,.2,1), opacity 240ms ease";
      el.style.transform  = "translateX(0)";
      el.style.opacity    = "1";
    }));
  }, []);

  return (
    <div ref={ref} style={{ willChange: "transform, opacity" }}>
      <h1 style={{
        fontFamily: "var(--font-prose)", fontSize: 28, fontWeight: 500,
        color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.01em",
      }}>
        {step.prompt}
      </h1>
      {step.sub && (
        <p style={{ fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5, margin: "10px 0 24px" }}>
          {step.sub}
        </p>
      )}
      {!step.sub && <div style={{ height: 24 }} />}
      <FieldInput step={step} value={value} onChange={onChange} onSubmit={onSubmit} t={t} currency={currency} />
    </div>
  );
}

// ─── Field input switcher ─────────────────────────────────────────────────
function FieldInput({ step, value, onChange, onSubmit, t, currency }) {
  switch (step.kind) {
    case "text":
      return (
        <input
          autoFocus
          value={value || ""}
          onChange={e => onChange(sanitizeText(e.target.value))}
          onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
          placeholder={step.placeholder}
          maxLength={MAX_SHORT}
          style={bigInputStyle()}
        />
      );
    case "textarea":
      return (
        <textarea
          autoFocus
          value={value || ""}
          onChange={e => onChange(sanitizeText(e.target.value))}
          placeholder={step.placeholder}
          rows={5}
          maxLength={MAX_LONG}
          style={{ ...bigInputStyle(), padding: "10px 0", resize: "none" }}
        />
      );
    case "money":
      return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, borderBottom: "1.5px solid var(--border)", paddingBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-prose)", fontSize: 32, color: "#8A9A8A" }}>$</span>
          <input
            autoFocus
            inputMode="numeric"
            value={value || ""}
            onChange={e => onChange(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
            placeholder={step.placeholder}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: "var(--font-prose)", fontSize: 36, fontWeight: 500,
              color: "var(--ink)", letterSpacing: "-0.02em", padding: 0,
            }}
          />
          <span style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase" }}>K {currency || "USD"}</span>
        </div>
      );
    case "tags":
      return <TagsInput value={value || []} onChange={onChange} placeholder={step.placeholder} />;
    case "threshold":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {t.thresholdOptions.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); onSubmit(); }}
              style={{
                padding: "14px 18px", borderRadius: 12, textAlign: "left",
                background: value === o.value ? "var(--ink)" : "var(--cream)",
                border: `1px solid ${value === o.value ? "var(--ink)" : "var(--border)"}`,
                color: value === o.value ? "#F4F8F0" : "var(--ink)",
                fontFamily: "var(--font-prose)", fontSize: 15, cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >{o.label}</button>
          ))}
        </div>
      );
    case "choice":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {(step.options || []).map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); onSubmit(); }}
              style={{
                padding: "14px 18px", borderRadius: 12, textAlign: "left",
                background: value === o.value ? "var(--ink)" : "var(--cream)",
                border: `1px solid ${value === o.value ? "var(--ink)" : "var(--border)"}`,
                color: value === o.value ? "#F4F8F0" : "var(--ink)",
                fontFamily: "var(--font-prose)", fontSize: 15, cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >{o.label}</button>
          ))}
        </div>
      );
    case "country":
      return <CountryPickerField value={value} onChange={onChange} onSelect={code => { onChange(code); onSubmit(); }} />;
    default:
      return null;
  }
}

function bigInputStyle() {
  return {
    width: "100%", border: "none", outline: "none", background: "transparent",
    fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 400,
    color: "var(--ink)", letterSpacing: "-0.01em",
    padding: "8px 0", borderBottom: "1.5px solid var(--border)",
    boxSizing: "border-box",
  };
}

// ─── TagsInput ────────────────────────────────────────────────────────────
function TagsInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = sanitizeText(draft.trim());
    if (!v || value.includes(v)) { setDraft(""); return; }
    onChange([...value, v]);
    setDraft("");
  }

  function remove(tag) {
    onChange(value.filter(v => v !== tag));
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {value.map(tag => (
            <span key={tag} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 6px 6px 12px", borderRadius: 20,
              background: "var(--cream)", border: "0.5px solid var(--border)",
              fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--ink)",
            }}>
              {tag}
              <button onClick={() => remove(tag)} aria-label="Remove" style={{
                width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none", cursor: "pointer", color: "#8A9A8A",
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.4"/>
                  <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length > 0) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "Add another…" : placeholder}
        maxLength={MAX_SHORT}
        style={bigInputStyle()}
      />
      <div style={{ marginTop: 8, fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase" }}>
        {value.length} ADDED · ENTER TO ADD
      </div>
    </div>
  );
}

// ─── CountryPickerField ───────────────────────────────────────────────────
const POPULAR = COUNTRIES.filter(c => POPULAR_CODES.includes(c.code))
  .sort((a, b) => POPULAR_CODES.indexOf(a.code) - POPULAR_CODES.indexOf(b.code));
const OTHERS  = COUNTRIES.filter(c => !POPULAR_CODES.includes(c.code))
  .sort((a, b) => a.name.localeCompare(b.name));

function CountryPickerField({ value, onChange, onSelect }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
    : null;

  function CountryRow({ country }) {
    const selected = country.code === value;
    return (
      <button
        onClick={() => onSelect(country.code)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "11px 12px", borderRadius: 10, textAlign: "left",
          background: selected ? "var(--cream)" : "transparent",
          border: selected ? "0.5px solid var(--border)" : "0.5px solid transparent",
          cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{country.flag}</span>
        <span style={{ flex: 1, fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)", lineHeight: 1.3 }}>
          {country.name}
        </span>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.08em", color: "#8A9A8A", textTransform: "uppercase", flexShrink: 0 }}>
          {country.currency}
        </span>
        {selected && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 5L4.5 8.5L11 1" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    );
  }

  function SectionLabel({ label }) {
    return (
      <div style={{ padding: "10px 12px 4px", fontFamily: "var(--font-data)", fontSize: 8.5, letterSpacing: "0.14em", color: "#8A9A8A", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 4 }}>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px", borderRadius: 12,
        background: "var(--cream)", border: "0.5px solid var(--border)",
        marginBottom: 10,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "#8A9A8A" }}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search countries…"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)",
            padding: "11px 0",
          }}
        />
        {query && (
          <button onClick={() => { setQuery(""); searchRef.current?.focus(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", padding: 4, display: "flex" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* Country list */}
      <div style={{ maxHeight: 320, overflowY: "auto", WebkitOverflowScrolling: "touch", margin: "0 -4px" }}>
        {filtered ? (
          filtered.length > 0
            ? filtered.map(c => <CountryRow key={c.code} country={c} />)
            : <div style={{ padding: "24px 12px", fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)", textAlign: "center" }}>No countries found.</div>
        ) : (
          <>
            <SectionLabel label="Popular" />
            {POPULAR.map(c => <CountryRow key={c.code} country={c} />)}
            <SectionLabel label="All Countries" />
            {OTHERS.map(c => <CountryRow key={c.code} country={c} />)}
          </>
        )}
      </div>
    </div>
  );
}
