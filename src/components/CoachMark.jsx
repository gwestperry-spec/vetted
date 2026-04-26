// ─── CoachMark — contextual first-run guide ───────────────────────────────
// Appears once per localStorage key. × dismisses permanently.
// Supports RTL for Arabic.

import { useState } from "react";

export default function CoachMark({ storageKey, title, body, dir = "ltr" }) {
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  return (
    <div
      dir={dir}
      style={{
        position: "relative",
        margin: "0 0 16px",
        padding: "12px 40px 12px 14px",
        background: "#F0F6EE",
        border: "1px solid #C8DDB8",
        borderLeft: "3px solid #3A7A3A",
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        style={{
          position: "absolute",
          top: 10,
          [dir === "rtl" ? "left" : "right"]: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#7B776C",
          fontSize: 16,
          lineHeight: 1,
          padding: "2px 4px",
          minHeight: 28,
          minWidth: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>

      {/* Title */}
      <p style={{
        fontFamily: "var(--font-data)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        color: "#3A7A3A",
        marginBottom: 5,
      }}>
        {title}
      </p>

      {/* Body */}
      <p style={{
        fontFamily: "var(--font-prose)",
        fontStyle: "normal",
        fontSize: 13,
        color: "#1A2E1A",
        lineHeight: 1.6,
        margin: 0,
      }}>
        {body}
      </p>
    </div>
  );
}
