// ─── FrameworkPicker ────────────────────────────────────────────────────────
// Optional starter-template chooser shown above the filter customization
// step. User picks a role-typed template → onApply(weights) writes those
// weights onto the existing 5 canonical filters → user continues into the
// usual filter-tuning step.
//
// No new filter content is created — only weights change. So zero
// per-template translation cost for the filter descriptions themselves;
// only the template metadata (role name + blurb) is translated.

import { FRAMEWORK_TEMPLATES, getTemplateField } from "../data/frameworkTemplates.js";

export default function FrameworkPicker({ t = {}, lang = "en", onApply, onSkip }) {
  return (
    <div style={{ padding: "0 0 16px" }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--muted)",
          margin: "0 0 6px",
        }}>
          {t.frameworkPickerEyebrow || "STARTER FRAMEWORK"}
        </p>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
          color: "var(--ink)", margin: 0, lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}>
          {t.frameworkPickerTitle || "Pick a framework that fits your role."}
        </h3>
        <p style={{
          fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)",
          margin: "8px 0 0", lineHeight: 1.5,
        }}>
          {t.frameworkPickerSub || "Each template weighs the five filters differently. You can fine-tune anything after picking."}
        </p>
      </div>

      {/* Horizontal scroll carousel — each template is a fixed-width
          card the user pages through with a swipe. Negative side-margin
          + per-card padding lets the row bleed to the screen edges
          without breaking the page gutter. */}
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          padding: "2px 20px 4px",
          margin: "0 -20px",
        }}
      >
        {FRAMEWORK_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onApply?.(tpl)}
            style={{
              flex: "0 0 78%",
              maxWidth: 320,
              scrollSnapAlign: "start",
              textAlign: "left",
              background: "var(--cream)",
              border: "0.5px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              transition: "border-color 180ms ease, background 180ms ease",
            }}
          >
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
              color: "var(--ink)", marginBottom: 4, lineHeight: 1.25,
            }}>
              {getTemplateField(tpl, "role_type", lang)}
            </div>
            <div style={{
              fontFamily: "var(--font-prose)", fontSize: 12.5,
              color: "var(--muted)", lineHeight: 1.45,
            }}>
              {getTemplateField(tpl, "blurb", lang)}
            </div>
            <WeightStrip weights={tpl.weights} />
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          width: "100%",
          background: "transparent",
          border: "0.5px solid var(--border)",
          borderRadius: 10,
          fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        {t.frameworkPickerSkip || "Build from scratch instead →"}
      </button>
    </div>
  );
}

// Tiny 5-dot strip showing the relative weight on each of the 5 canonical
// filters — quick visual signal of which template emphasizes what.
function WeightStrip({ weights }) {
  const filterOrder = [
    "pl_ownership",
    "reporting_structure",
    "metric_specificity",
    "scope_language",
    "title_gap",
  ];
  const weightSizes = { 1.0: 4, 1.5: 6, 2.0: 8, 2.5: 10, 3.0: 12 };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginTop: 10,
    }}>
      {filterOrder.map((id) => {
        const w = weights[id] ?? 2.0;
        const size = weightSizes[w] ?? 8;
        return (
          <span
            key={id}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: w >= 2.5 ? "var(--ink)" : "var(--border)",
              flexShrink: 0,
            }}
            aria-label={`${id} weight ${w}`}
          />
        );
      })}
      <span style={{
        marginLeft: 6,
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "var(--muted)",
      }}>
        Weighting
      </span>
    </div>
  );
}
