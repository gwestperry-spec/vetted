import { useState, useId } from "react";
import WeightPicker from "./WeightPicker.jsx";
import { resolveLang } from "../utils/langUtils.js";

// ─── Input limits (mirrored from App.jsx constants) ───────────────────────
const MAX_SHORT = 200;
const MAX_LONG  = 2000;

// ─── FiltersStep ──────────────────────────────────────────────────────────
// Step 3 of the onboarding wizard. Lets users review core filters, add
// suggested filters (Signal+), and add fully custom filters (Signal+).
export default function FiltersStep({ t, lang, filters, setFilters, onBack, onNext, userTier, onUpgrade }) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const newNameId = useId();
  const newDescId = useId();

  const fn = (field) => resolveLang(field, lang);
  const suggested = t.filterSuggestions.filter(s => !filters.some(f => fn(f.name) === s.name));
  const isPaid = userTier && userTier !== "free";

  function updateWeight(id, weight) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, weight } : f));
  }

  function removeFilter(id) {
    setFilters(prev => prev.filter(f => f.id !== id));
  }

  function addSuggested(s) {
    if (!isPaid) { onUpgrade?.(); return; }
    setFilters(prev => [
      ...prev,
      { name: s.name, description: s.description, id: `custom_${Date.now()}`, weight: 1.0, isCore: false },
    ]);
  }

  function addCustom() {
    if (!newName.trim()) return;
    if (!isPaid) { onUpgrade?.(); return; }
    setFilters(prev => [
      ...prev,
      { name: newName.trim(), description: newDesc.trim(), id: `custom_${Date.now()}`, weight: 1.0, isCore: false },
    ]);
    setNewName("");
    setNewDesc("");
  }

  return (
    <section aria-labelledby="filters-heading">
      <div className="card">
        <h2 className="card-title" id="filters-heading">{t.filtersTitle}</h2>
        <p className="card-subtitle">{t.filtersSubtitle}</p>

        {/* ── Core filters ────────────────────────────────────────────── */}
        <div className="section-label" aria-hidden="true">{t.coreFilters}</div>
        <div role="list" aria-label={t.coreFilters}>
          {filters.filter(f => f.isCore).map(f => (
            <div key={f.id} className="custom-filter-row" role="listitem" style={{ background: "#F0F4F0", borderRadius: 8, border: "1px solid #D8E8D8", padding: "14px 16px", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-data)", fontWeight: 600, fontSize: 12, color: "#3A5A3A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{fn(f.name)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{fn(f.description)}</div>
              </div>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <label style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "#8A9A8A", letterSpacing: "0.15em", textTransform: "uppercase" }}>{t.labelWeight}</label>
                <WeightPicker value={f.weight} onChange={w => updateWeight(f.id, w)} ariaLabel={`${t.labelWeight}: ${fn(f.name)}`} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Custom filters (existing) ────────────────────────────────── */}
        {filters.filter(f => !f.isCore).length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 24 }} aria-hidden="true">{t.customFilters}</div>
            <div role="list" aria-label={t.customFilters}>
              {filters.filter(f => !f.isCore).map(f => (
                <div key={f.id} className="custom-filter-row" role="listitem" style={{ background: "#F0F4F0", borderRadius: 8, border: "1px solid #D8E8D8", padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-data)", fontWeight: 600, fontSize: 12, color: "#3A5A3A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{fn(f.name)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{fn(f.description)}</div>
                  </div>
                  <WeightPicker value={f.weight} onChange={w => updateWeight(f.id, w)} ariaLabel={`${t.labelWeight}: ${fn(f.name)}`} />
                  <button
                    className="filter-delete-btn"
                    onClick={() => removeFilter(f.id)}
                    aria-label={`Remove ${fn(f.name)}`}
                  >×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Suggested filters (Signal+) ──────────────────────────────── */}
        {suggested.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div className="section-label" aria-hidden="true">{t.suggestedFilters}</div>
              {!isPaid && (
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
                  letterSpacing: ".1em", textTransform: "uppercase",
                  background: "var(--accent)", color: "#fff", padding: "2px 7px", borderRadius: 20,
                }}>Signal</span>
              )}
            </div>
            <div className="tags" style={{ marginBottom: 16 }}>
              {suggested.map(s => (
                <button key={s.name} className="btn btn-secondary btn-sm" onClick={() => addSuggested(s)}>
                  {!isPaid && <span style={{ marginRight: 4 }}>🔒</span>}+ {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Add custom filter (Signal+) ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, marginBottom: 0 }}>
          <div className="section-label" aria-hidden="true">{t.addCustomFilter}</div>
          {!isPaid && (
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              background: "var(--accent)", color: "#fff", padding: "2px 7px", borderRadius: 20,
            }}>Signal</span>
          )}
        </div>
        {!isPaid && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, marginTop: 6, lineHeight: 1.5 }}>
            Custom filters are a Signal feature.{" "}
            <button
              onClick={() => onUpgrade?.()}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, textDecoration: "underline" }}
            >
              Upgrade to Signal
            </button>{" "}to add filters tailored to your priorities.
          </p>
        )}
        <div className="field">
          <label htmlFor={newNameId}>{t.labelFilterName}</label>
          <input
            id={newNameId}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            maxLength={MAX_SHORT}
            disabled={!isPaid}
            style={!isPaid ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          />
        </div>
        <div className="field">
          <label htmlFor={newDescId}>{t.labelFilterDesc}</label>
          <textarea
            id={newDescId}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            style={{ minHeight: 70, ...(!isPaid ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
            maxLength={MAX_LONG}
            disabled={!isPaid}
          />
        </div>
        <button
          onClick={addCustom}
          disabled={!newName.trim() || !isPaid}
          style={{
            width: "100%",
            padding: 16,
            background: "transparent",
            border: "1px dashed #C8D8C8",
            borderRadius: 8,
            color: "#8A9A8A",
            fontSize: 13,
            fontFamily: "var(--font-prose)",
            textAlign: "center",
            cursor: !newName.trim() || !isPaid ? "not-allowed" : "pointer",
            opacity: !newName.trim() || !isPaid ? 0.5 : 1,
          }}
        >{t.btnAddFilter}</button>

        <div className="btn-actions">
          <button className="btn btn-secondary" onClick={onBack}>{t.btnBack}</button>
          <button className="btn btn-primary"   onClick={onNext}>{t.btnStartScoring}</button>
        </div>
      </div>
    </section>
  );
}
