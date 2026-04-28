// Vetted — Hamburger menu sheet
// Two-pane: root menu + share-scorecard picker.
// Backdrop dims content. Slide-in animation between panes.

import { useState } from "react";

// ─── Sub-icons ────────────────────────────────────────────────────────────────
function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M3 1.5L7 5L3 8.5" stroke="#8A9A8A" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3H11V9" stroke="#8A9A8A" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11 3L4 10" stroke="#8A9A8A" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M4 4.5L7 1.5L10 4.5" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.5 8V11.5C2.5 11.78 2.72 12 3 12H11C11.28 12 11.5 11.78 11.5 11.5V8"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconUpgrade() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3.5 6.5L7 3L10.5 6.5" stroke="currentColor"
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── HamburgerButton ──────────────────────────────────────────────────────────
export function HamburgerButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      style={{
        width: 44, height: 44,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: "pointer",
        color: "var(--ink)", padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <line x1="3.5" y1="7"  x2="18.5" y2="7"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="3.5" y1="11" x2="18.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="3.5" y1="15" x2="18.5" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

// ─── RootPane ─────────────────────────────────────────────────────────────────
function RootPane({ items, onItem }) {
  return (
    <>
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => onItem(item.id)}
          style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
            padding: "14px 16px", minHeight: 56,
            background: "transparent", border: "none", cursor: "pointer",
            borderTop: i === 0 ? "none" : "0.5px solid var(--border)",
            textAlign: "left",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {item.icon && (
              <div style={{ color: item.accent === "gold" ? "var(--gold)" : "var(--ink)", flexShrink: 0 }}>
                {item.icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "var(--font-prose)", fontSize: 15, fontWeight: 500,
                color: item.danger ? "var(--error)" : "var(--ink)",
                lineHeight: 1.2,
              }}>
                {item.label}
              </div>
              {item.hint && (
                <div style={{
                  fontFamily: "var(--font-data)", fontSize: 9,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: item.accent === "gold" ? "var(--gold)" : "#8A9A8A",
                  marginTop: 3,
                  fontWeight: item.accent === "gold" ? 500 : 400,
                }}>
                  {item.hint}
                </div>
              )}
            </div>
          </div>
          {item.external
            ? <IconExternal/>
            : (item.chevron && <IconChevronRight/>)}
        </button>
      ))}
    </>
  );
}

// ─── AboutPane ───────────────────────────────────────────────────────────────
const APP_VERSION = "2.001.3";

function AboutPane({ onBack }) {
  const links = [
    { label: "Privacy Policy",   url: "https://tryvettedai.com/privacy" },
    { label: "Terms of Service", url: "https://tryvettedai.com/terms" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "0.5px solid var(--border)" }}>
        <button onClick={onBack} aria-label="Back" style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)", padding: 0, marginLeft: -4 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <div style={{ fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.1 }}>About & Privacy</div>
          <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", marginTop: 2, textTransform: "uppercase" }}>VETTED · VERSION {APP_VERSION}</div>
        </div>
      </div>

      {links.map((l, i) => (
        <button key={l.label} onClick={() => window.open(l.url, "_blank", "noopener")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", minHeight: 52, background: "transparent", border: "none", cursor: "pointer", borderTop: i === 0 ? "none" : "0.5px solid var(--border)", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
          <span style={{ fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)" }}>{l.label}</span>
          <IconExternal/>
        </button>
      ))}

      <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--border)", background: "var(--cream)" }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase", lineHeight: 1.7 }}>
          <div>Vetted AI · Version {APP_VERSION}</div>
          <div>© 2024–{new Date().getFullYear()} Vetted AI. All rights reserved.</div>
          <div style={{ marginTop: 6 }}>Vetted Career Intelligence: built for the executives of yesterday, tomorrow, forever.</div>
        </div>
      </div>
    </>
  );
}

// ─── SharePane ────────────────────────────────────────────────────────────────
function SharePane({ roles, onBack, onPick }) {
  function scoreColor(v) {
    if (v === "PURSUE") return "var(--score-high)";
    if (v === "MONITOR") return "var(--score-mid)";
    return "var(--score-pass)";
  }
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 14px",
        borderBottom: "0.5px solid var(--border)",
      }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 32, height: 32, display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--ink)", padding: 0, marginLeft: -4,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <div style={{ fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.1 }}>
            Share scorecard
          </div>
          <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", marginTop: 2, textTransform: "uppercase" }}>
            PICK A ROLE TO EXPORT
          </div>
        </div>
      </div>

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {roles.length === 0 && (
          <div style={{ padding: "20px 16px", fontFamily: "var(--font-prose)", fontSize: 13, color: "#8A9A8A", textAlign: "center" }}>
            No scored roles yet.
          </div>
        )}
        {roles.map((r, i) => (
          <button
            key={r.role_id || r.id || i}
            onClick={() => onPick(r)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 12, padding: "12px 14px", minHeight: 52,
              background: "transparent", border: "none", cursor: "pointer",
              borderTop: i === 0 ? "none" : "0.5px solid var(--border)",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{
              width: 32, textAlign: "right",
              fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500,
              color: scoreColor(r.framework_snapshot?.recommendation?.toUpperCase() || "PASS"),
              letterSpacing: "-0.01em", lineHeight: 1, flexShrink: 0,
            }}>
              {typeof r.vq_score === "number" ? r.vq_score.toFixed(1) : "—"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "var(--font-prose)", fontSize: 13.5, fontWeight: 500,
                color: "var(--ink)", lineHeight: 1.2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {r.title || "Untitled role"}
              </div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                color: "#8A9A8A", marginTop: 2, textTransform: "uppercase",
              }}>
                {r.company || ""}
              </div>
            </div>
            <IconChevronRight/>
          </button>
        ))}
      </div>

      <div style={{
        padding: "10px 14px",
        borderTop: "0.5px solid var(--border)",
        background: "var(--cream)",
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
        color: "#8A9A8A", textTransform: "uppercase",
      }}>
        VANTAGE · PDF EXPORT INCLUDED
      </div>
    </>
  );
}

// ─── HamburgerSheet ───────────────────────────────────────────────────────────
// Props:
//   open         — boolean
//   onClose      — () => void
//   onItem       — (id: string, payload?: any) => void
//   workspaceRoles — array of workspace roles for share pane
//   foundingSlotsLeft — total founding slots remaining (for upgrade hint)
export default function HamburgerSheet({
  open,
  onClose,
  onItem = () => {},
  workspaceRoles = [],
  foundingSlotsLeft = 0,
  t = {},
}) {
  const [pane, setPane] = useState("root");

  if (!open) return null;

  const upgradeHint = foundingSlotsLeft > 0
    ? `Founding · ${foundingSlotsLeft} lifetime spots left`
    : (t.menuHintUpgrade || "Signal · Vantage");

  const items = [
    { id: "upgrade",  label: t.menuUpgrade  || "Upgrade",         hint: upgradeHint, accent: "gold", icon: <IconUpgrade/>, chevron: true },
    { id: "advocate", label: t.menuAdvocate || "VQ Advocate",      hint: t.menuHintAdvocate || "Patterns · Coaching · Insights", chevron: true },
    { id: "share",    label: t.menuShare    || "Share scorecard…", hint: t.menuHintShare || "Export role as PDF", icon: <IconShare/>, chevron: true },
    { id: "blog",     label: t.menuBlog     || "Blog",             hint: "tryvettedai.com/blog", external: true },
    { id: "settings", label: t.menuSettings || "Settings",         hint: t.menuHintSettings || "Language · Notifications", chevron: true },
    { id: "about",    label: t.menuAbout    || "About & Privacy",  hint: t.menuHintAbout || "Terms · Data · Version", chevron: true },
    { id: "signout",  label: t.menuSignOut  || "Sign out",         danger: true },
  ];

  function close() {
    setPane("root");
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(26,46,26,0.18)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 200,
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed",
        top: 60, right: 12,
        width: 268,
        background: "var(--paper)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        zIndex: 201,
        animation: "vt-sheet-in 180ms ease-out",
      }}>
        <style>{`
          @keyframes vt-sheet-in {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {pane === "root" && (
          <RootPane
            items={items}
            onItem={(id) => {
              if (id === "share") { setPane("share"); return; }
              if (id === "about") { setPane("about"); return; }
              onItem(id);
              close();
            }}
          />
        )}
        {pane === "share" && (
          <SharePane
            roles={workspaceRoles.filter(r => r.vq_score != null && r.status !== "queued")}
            onBack={() => setPane("root")}
            onPick={(role) => {
              onItem("share", role);
              close();
            }}
          />
        )}
        {pane === "about" && (
          <AboutPane onBack={() => setPane("root")} />
        )}
      </div>
    </>
  );
}
