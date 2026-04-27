// Vetted — Persistent bottom tab bar
// 5 destinations: SCORE / WORKSPACE / MARKET / FILTERS / PROFILE
// Liquid-glass background, 0.5px hairline top, 22px home-indicator pad.

import React from "react";

const ICONS = {
  score: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7.25" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="11" cy="11" r="3.25" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="11" cy="11" r="0.9" fill="currentColor"/>
    </svg>
  ),
  workspace: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3.25" y="3.25" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="12.25" y="3.25" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="3.25" y="12.25" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="12.25" y="12.25" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  market: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polyline points="3,15 7.5,10 11,12.5 15,7 19,9.5"
                stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="15" cy="7" r="1.6" fill="currentColor"/>
    </svg>
  ),
  filters: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="3.5" y1="6.5"  x2="18.5" y2="6.5"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="3.5" y1="11"   x2="18.5" y2="11"   stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="3.5" y1="15.5" x2="18.5" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8"  cy="6.5"  r="1.7" fill="currentColor" stroke="var(--paper)" strokeWidth="1.4"/>
      <circle cx="14" cy="11"   r="1.7" fill="currentColor" stroke="var(--paper)" strokeWidth="1.4"/>
      <circle cx="7"  cy="15.5" r="1.7" fill="currentColor" stroke="var(--paper)" strokeWidth="1.4"/>
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8"  r="3.25" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.75 18.5C4.7 14.9 7.6 13 11 13C14.4 13 17.3 14.9 18.25 18.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  ),
};

const TABS = [
  { id: "score",     label: "SCORE"     },
  { id: "workspace", label: "WORKSPACE" },
  { id: "market",    label: "MARKET",   sublabel: "PULSE" },
  { id: "filters",   label: "FILTERS"   },
  { id: "profile",   label: "PROFILE"   },
];

export default function TabBarV2({ active = "workspace", onChange = () => {} }) {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        display: "flex",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderTop: "0.5px solid var(--border)",
        background: "rgba(250,250,248,0.88)",
        backdropFilter: "saturate(140%) blur(20px)",
        WebkitBackdropFilter: "saturate(140%) blur(20px)",
        paddingTop: 8,
        paddingBottom: 22,
        maxWidth: 860,
        margin: "0 auto",
      }}
    >
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const color = isActive ? "var(--accent)" : "#8A9A8A";
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.id === "market" ? "Market Pulse" : tab.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              minHeight: 44,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color,
              padding: "4px 2px",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {ICONS[tab.id]}
            <span style={{
              fontFamily: "var(--font-data)",
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: "0.10em",
              color,
              marginTop: 1,
              textAlign: "center",
              lineHeight: 1.15,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              <span>{tab.label}</span>
              {tab.sublabel && <span>{tab.sublabel}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
