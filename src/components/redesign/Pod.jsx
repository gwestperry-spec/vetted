// ── Pod.jsx ───────────────────────────────────────────────────────────────
// Horizontal scroll-snap carousel with dot indicators. Used for the
// behavioral insights pod on Workspace and elsewhere a swipeable card
// stack fits the editorial vocabulary.
//
// Children: an array of card nodes. The component handles snap, dots,
// and emits onActiveChange(index) when the user swipes.

import React, { useEffect, useRef, useState } from "react";

export default function Pod({
  children,
  cardWidth,          // optional fixed card width in px; default = container width minus gap
  gap = 10,           // px between cards
  paddingX = 22,      // px horizontal padding (matches Workspace inset)
  onActiveChange,     // function(index) callback when active card changes
  ariaLabel = "Insights carousel",
}) {
  const cards = React.Children.toArray(children);
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);

  // Detect which card is centered on each scroll settle
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sl = el.scrollLeft;
        const w = el.firstElementChild ? el.firstElementChild.getBoundingClientRect().width + gap : el.clientWidth;
        const idx = Math.round(sl / w);
        const clamped = Math.max(0, Math.min(cards.length - 1, idx));
        if (clamped !== active) {
          setActive(clamped);
          onActiveChange && onActiveChange(clamped);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [cards.length, active, gap, onActiveChange]);

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        style={{
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          padding: `0 ${paddingX}px 4px`,
          gap,
          scrollbarWidth: "none",
        }}
      >
        {cards.map((node, i) => (
          <div
            key={i}
            style={{
              flex: cardWidth ? `0 0 ${cardWidth}px` : `0 0 calc(100% - ${paddingX * 2 - gap}px)`,
              minWidth: 0,
              scrollSnapAlign: "start",
            }}
          >
            {node}
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{
        display: "flex", gap: 6, justifyContent: "center",
        padding: "10px 0 14px",
      }}>
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === active ? "var(--ink)" : "var(--border)",
              transition: "background var(--t-fast)",
            }}
            aria-label={`Card ${i + 1} of ${cards.length}${i === active ? " (active)" : ""}`}
          />
        ))}
      </div>

      {/* Hide WebKit scrollbar inside the carousel */}
      <style>{`
        div[role="region"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
