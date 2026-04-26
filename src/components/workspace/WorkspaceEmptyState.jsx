// ─── WorkspaceEmptyState ───────────────────────────────────────────────────
// Guided empty state for each workspace section.
// No dead ends — every section explains what belongs there and how to fill it.
// Matches the tone and visual treatment of the existing Submit an Opportunity
// empty state in Dashboard.jsx.

export default function WorkspaceEmptyState({ section, onScoreNewRole, t }) {
  const config = {
    today: {
      icon: "◎",
      heading: t?.emptyTodayHeading    || "Nothing due today",
      body:    t?.emptyTodayBody       || "Roles with a follow-up date set to today appear here. Add a reminder to any active role to surface it on the right day.",
      action: null,
    },
    active: {
      icon: "⊟",
      heading: t?.emptyActiveHeading   || "Your workspace is empty",
      body:    t?.emptyActiveBody      || "Every role you score lands here — automatically, with its full analysis preserved. Paste a job description or URL to score your first role.",
      action: { label: t?.emptyScoreBtn || "Score a Role", fn: onScoreNewRole },
    },
    archived: {
      icon: "↓",
      heading: t?.emptyArchivedHeading || "No archived roles",
      body:    t?.emptyArchivedBody    || "Roles you archive move here. Your full analysis is preserved — nothing is ever deleted.",
      action: null,
    },
  };

  const { icon, heading, body, action } = config[section] || config.active;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 20px", textAlign: "center",
      background: "#FAFAF8",
      border: "1px dashed #D8E8D8",
      borderRadius: 8,
      marginBottom: 12,
    }}>
      <span style={{
        fontFamily: "var(--font-data)", fontSize: 22,
        color: "#1A2E1A", marginBottom: 10,
        lineHeight: 1,
      }}>{icon}</span>
      <p style={{
        fontFamily: "var(--font-prose)", fontWeight: 600,
        fontSize: 13, color: "#1A2E1A",
        marginBottom: 6,
      }}>{heading}</p>
      <p style={{
        fontFamily: "var(--font-prose)", fontSize: 12,
        color: "#1A2E1A", lineHeight: 1.6,
        maxWidth: 260, marginBottom: action ? 14 : 0,
      }}>{body}</p>
      {action && (
        <button
          onClick={action.fn}
          style={{
            fontFamily: "var(--font-prose)", fontSize: 12, fontWeight: 500,
            color: "#1A2E1A", background: "#EAF3DE",
            border: "1px solid #C8DDB8",
            borderRadius: 6, padding: "7px 16px",
            cursor: "pointer", minHeight: 36,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
