// ── ThoughtCard.jsx ───────────────────────────────────────────────────────
// Modal overlay that slides up from the bottom to ~85% of the screen,
// dimming the landing behind it to ~30% visibility. Used for the per-tile
// reading experience inside pill landings.
//
// Structure:
//   ─ Grabber (visual handle)
//   ─ Top row: PILL · SECTION breadcrumb | × close pill
//   ─ Body: serif title + Inter body (+ optional italic pull-quote)
//   ─ Provenance line (optional): SOURCE · FILTER N OF M · X.X/5
//   ─ Bottom strip: NEXT · [next pill] → button (Coach uses DRAFT COVER LETTER)
//
// Dismiss paths (all return to the landing at its prior scroll position):
//   - tap × close
//   - tap the dim backdrop layer
//   - swipe down on the card (basic support via touch listeners)

import React, { useEffect, useRef } from "react";
import { Icon } from "./IconSet.jsx";
import NextPrompt from "./NextPrompt.jsx";

export default function ThoughtCard({
  pillName,           // e.g. "INSIGHTS"
  sectionLabel,       // e.g. "HONEST FIT"
  title,              // serif title (no italic)
  children,           // body content
  provenance,         // optional small line at bottom of body
  nextLabel,          // e.g. "FILTERS" — pass null on Coach if action tile already drives forward
  nextHint,           // optional override of NextPrompt hint
  onNext,             // function() advance to next pill
  onClose,            // function() dismiss the card
}) {
  const cardRef = useRef(null);

  // Lock background scroll while card is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to dismiss (keyboard accessibility on web)
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Basic swipe-down to dismiss
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touchStart.current == null) return;
    const dy = (e.changedTouches[0].clientY - touchStart.current);
    touchStart.current = null;
    if (dy > 80 && onClose) onClose();
  };

  return (
    <>
      {/* Dim backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.42)",
          zIndex: 100,
          animation: "fade-in var(--t-fast) ease both",
        }}
      />

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          height: "85vh",
          background: "var(--paper)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          display: "flex", flexDirection: "column",
          zIndex: 101,
          animation: "slide-up var(--t-slow) ease both",
        }}
      >
        {/* Grabber */}
        <div style={{
          padding: "8px 0 4px",
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            width: 36, height: 5, borderRadius: 3,
            background: "rgba(26,46,26,0.18)",
          }} />
        </div>

        {/* Top row: breadcrumb + close */}
        <div style={{
          padding: "8px 20px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--muted-soft)",
            textTransform: "uppercase",
          }}>
            {pillName} · {sectionLabel}
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 20,
              width: 32, height: 32,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <Icon name="close" size={11} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="no-scrollbar" style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 22px 16px",
        }}>
          <h2 style={{
            fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
            letterSpacing: "-0.005em", color: "var(--ink)",
            lineHeight: 1.25, margin: "8px 0 14px",
          }}>
            {title}
          </h2>

          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 14, lineHeight: 1.55,
            color: "var(--ink)",
          }}>
            {children}
          </div>

          {provenance && (
            <div style={{
              marginTop: 18,
              fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 400,
              letterSpacing: "0.18em", color: "var(--muted-soft)",
              textTransform: "uppercase",
            }}>
              {provenance}
            </div>
          )}
        </div>

        {nextLabel && (
          <NextPrompt
            hint={nextHint || "Read complete. Move forward."}
            label={nextLabel}
            onNext={onNext}
          />
        )}
      </div>

      {/* Inline keyframes so this component is self-contained */}
      <style>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0 }
          to   { transform: translateY(0%);   opacity: 1 }
        }
      `}</style>
    </>
  );
}
