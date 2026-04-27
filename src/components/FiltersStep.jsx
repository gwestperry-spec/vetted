import { useState } from "react";
import { resolveLang } from "../utils/langUtils.js";
import { sanitizeText, MAX_SHORT, MAX_LONG } from "../utils/sanitize.js";

const WEIGHT_STEPS = [
  { value: 1.0, labelKey: "weightNotImportant" },
  { value: 1.5, labelKey: "weightSlightlyImportant" },
  { value: 2.0, labelKey: "weightImportant" },
  { value: 2.5, labelKey: "weightVeryImportant" },
  { value: 3.0, labelKey: "weightCritical" },
];

function weightToIdx(w) {
  return WEIGHT_STEPS.reduce((best, s, i) =>
    Math.abs(s.value - w) < Math.abs(WEIGHT_STEPS[best].value - w) ? i : best, 0);
}

export default function FiltersStep({ t, lang, filters, setFilters, onBack, onNext, userTier, onUpgrade }) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fn = (field) => resolveLang(field, lang);
  const isPaid = userTier && userTier !== "free";
  const suggested = t.filterSuggestions.filter(s => !filters.some(f => fn(f.name) === s.name));

  function updateWeight(id, w) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, weight: w } : f));
  }
  function removeFilter(id) {
    setFilters(prev => prev.filter(f => f.id !== id));
  }
  function addSuggested(s) {
    if (!isPaid) { onUpgrade?.(); return; }
    setFilters(prev => [...prev, { name: s.name, description: s.description, id: `custom_${Date.now()}`, weight: 1.0, isCore: false }]);
  }
  function addCustom() {
    const name = sanitizeText(newName.trim());
    if (!name) return;
    if (!isPaid) { onUpgrade?.(); return; }
    setFilters(prev => [...prev, { name, description: sanitizeText(newDesc.trim()), id: `custom_${Date.now()}`, weight: 1.0, isCore: false }]);
    setNewName(""); setNewDesc("");
  }

  const coreFilters   = filters.filter(f => f.isCore);
  const customFilters = filters.filter(f => !f.isCore);

  return (
    <main id="main-content" aria-label="Filter weights" style={{ background: "var(--paper)", minHeight: "100%" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 20px 0" }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink)", textTransform: "uppercase" }}>
          VETTED
        </div>
      </header>

      {/* Title block */}
      <div style={{ padding: "14px 20px 20px" }}>
        <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          {t.stepFilters?.toUpperCase() || "FILTERS"}
        </p>
        <h1 style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 500, color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.005em" }}>
          {t.filtersTitle}
        </h1>
        <p style={{ margin: "12px 0 0", fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>
          {t.filtersSubtitle}
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ paddingBottom: 110 }}>

        {/* CORE section */}
        <FfSection title={t.coreFilters?.toUpperCase() || "CORE"} hint={String(coreFilters.length)} first />
        <div style={{ padding: "0 20px" }}>
          {coreFilters.map((f, i) => (
            <FfFilterCard
              key={f.id} f={f} fn={fn} t={t}
              isLast={i === coreFilters.length - 1}
              onWeight={w => updateWeight(f.id, w)}
            />
          ))}
        </div>

        {/* CUSTOM section */}
        <FfSection
          title={t.customFilters?.toUpperCase() || "CUSTOM"}
          hint={isPaid ? String(customFilters.length) : "SIGNAL+"}
        />
        <div style={{ padding: "0 20px" }}>
          {isPaid ? (
            <>
              {customFilters.map((f, i) => (
                <FfFilterCard
                  key={f.id} f={f} fn={fn} t={t}
                  isLast={i === customFilters.length - 1}
                  onWeight={w => updateWeight(f.id, w)}
                  removable onRemove={() => removeFilter(f.id)}
                />
              ))}

              {/* Suggested filter chips */}
              {suggested.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: customFilters.length > 0 ? 12 : 0, paddingBottom: 14 }}>
                  {suggested.map(s => (
                    <button key={s.name} onClick={() => addSuggested(s)} style={{
                      padding: "6px 12px", borderRadius: 20,
                      border: "0.5px dashed var(--border)", background: "transparent",
                      color: "var(--ink)", fontFamily: "var(--font-data)",
                      fontSize: 10, letterSpacing: "0.10em", cursor: "pointer",
                      textTransform: "uppercase",
                    }}>+ {s.name}</button>
                  ))}
                </div>
              )}

              {/* Add custom filter form */}
              <div style={{ marginTop: 4, paddingBottom: 4 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                    {t.labelFilterName}
                  </label>
                  <input
                    value={newName} onChange={e => setNewName(e.target.value)}
                    maxLength={MAX_SHORT}
                    placeholder={t.placeholderFilterName || "Filter name"}
                    style={{ width: "100%", border: "none", borderBottom: "1.5px solid var(--border)", background: "transparent", outline: "none", padding: "6px 0", fontFamily: "var(--font-prose)", fontSize: 16, color: "var(--ink)", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                    {t.labelFilterDesc}
                  </label>
                  <textarea
                    value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    maxLength={MAX_LONG}
                    placeholder={t.placeholderFilterDesc || "What does this filter measure?"}
                    style={{ width: "100%", border: "none", borderBottom: "1.5px solid var(--border)", background: "transparent", outline: "none", padding: "6px 0", fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)", resize: "none", minHeight: 56, boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={addCustom} disabled={!newName.trim()}
                  style={{
                    width: "100%", padding: 16, borderRadius: 12,
                    background: "var(--cream)", border: "0.5px dashed var(--border)",
                    color: newName.trim() ? "var(--ink)" : "var(--muted)",
                    fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.14em",
                    textTransform: "uppercase", cursor: newName.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                  {t.addCustomFilter?.toUpperCase() || "ADD FILTER"}
                </button>
              </div>
            </>
          ) : (
            <FfUpgradeGate t={t} onUpgrade={onUpgrade} />
          )}
        </div>

        {/* Save / Continue (onboarding context) */}
        {(onBack || onNext) && (
          <div style={{ padding: "28px 20px 0", display: "flex", alignItems: "center", justifyContent: onBack ? "space-between" : "flex-end" }}>
            {onBack && (
              <button onClick={onBack} aria-label="Back" style={{
                width: 52, height: 52, borderRadius: 999,
                background: "var(--cream)", border: "0.5px solid var(--border)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink)",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {onNext && (
              <button onClick={onNext} style={{
                minHeight: 52, padding: "0 28px", borderRadius: 999,
                background: "var(--ink)", color: "#F4F8F0",
                fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.16em", textTransform: "uppercase",
                border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 10,
              }}>
                {(t.btnStartScoring || "Continue").toUpperCase()}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function FfSection({ title, hint, first }) {
  return (
    <div style={{
      padding: "8px 20px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderTop: first ? "none" : "0.5px solid var(--border)",
      marginTop: first ? 0 : 16,
    }}>
      <div style={{
        fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.16em",
        color: "var(--ink)", textTransform: "uppercase", fontWeight: 500, paddingTop: 14,
      }}>{title}</div>
      {hint && (
        <div style={{
          fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em",
          color: "#8A9A8A", textTransform: "uppercase", paddingTop: 14,
        }}>{hint}</div>
      )}
    </div>
  );
}

function FfFilterCard({ f, fn, t, isLast, onWeight, removable, onRemove }) {
  const wIdx = weightToIdx(f.weight);
  const descriptor = t[WEIGHT_STEPS[wIdx].labelKey] || WEIGHT_STEPS[wIdx].labelKey;
  const accentColor = wIdx >= 4 ? "var(--accent)" : wIdx >= 2 ? "var(--ink)" : "var(--muted)";

  return (
    <article style={{
      padding: "20px 0",
      borderBottom: isLast ? "none" : "0.5px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: "var(--font-prose)", fontSize: 17, fontWeight: 500,
            color: "var(--ink)", margin: 0, lineHeight: 1.25, letterSpacing: "-0.005em",
          }}>{fn(f.name)}</h2>
          <p style={{
            margin: "6px 0 0", fontFamily: "var(--font-prose)", fontSize: 13.5,
            color: "var(--muted)", lineHeight: 1.5,
          }}>{fn(f.description)}</p>
        </div>
        {removable && (
          <button onClick={onRemove} aria-label={`Remove ${fn(f.name)}`} style={{
            width: 28, height: 28, flexShrink: 0, background: "transparent",
            border: "none", cursor: "pointer", color: "#8A9A8A", padding: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* 5-pip weight control */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {WEIGHT_STEPS.map((w, i) => (
            <button
              key={w.value}
              onClick={() => onWeight(w.value)}
              aria-label={`Set weight: ${t[w.labelKey] || w.labelKey}`}
              style={{
                flex: 1, height: 6, padding: 0, border: "none", borderRadius: 3,
                background: i <= wIdx ? accentColor : "#E5EBE3",
                cursor: "pointer", transition: "background 160ms ease",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => onWeight(WEIGHT_STEPS[(wIdx + 1) % WEIGHT_STEPS.length].value)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: "4px 0", minWidth: 110, textAlign: "right",
            fontFamily: "var(--font-prose)", fontSize: 13, fontStyle: "italic",
            color: accentColor, letterSpacing: "-0.005em",
            fontWeight: wIdx >= 2 ? 500 : 400,
          }}
        >{descriptor}</button>
      </div>
    </article>
  );
}

function FfUpgradeGate({ t, onUpgrade }) {
  return (
    <div style={{ padding: "24px 20px", background: "var(--cream)", borderRadius: 12, marginBottom: 12 }}>
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em",
        color: "var(--gold)", textTransform: "uppercase", fontWeight: 500, marginBottom: 10,
      }}>SIGNAL+ FEATURE</p>
      <h3 style={{
        fontFamily: "var(--font-prose)", fontSize: 19, fontWeight: 500,
        color: "var(--ink)", margin: 0, lineHeight: 1.25, letterSpacing: "-0.005em",
      }}>
        {t.customFilterGate || "Add custom filters to sharpen your scores."}
      </h3>
      <p style={{
        margin: "10px 0 18px", fontFamily: "var(--font-prose)", fontSize: 14,
        color: "var(--muted)", lineHeight: 1.55,
      }}>
        {t.customFilterGateSuffix || "Upgrade to Signal to add filters tailored to your priorities."}
      </p>
      <button onClick={() => onUpgrade?.()} style={{
        minHeight: 48, padding: "0 22px", borderRadius: 999,
        background: "var(--ink)", color: "#F4F8F0",
        fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.16em", textTransform: "uppercase",
        border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 10,
      }}>
        {(t.customFilterUpgrade || "UPGRADE TO SIGNAL").toUpperCase()}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
