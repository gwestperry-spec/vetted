// ── ProfileLanding.jsx ────────────────────────────────────────────────────
// Build-30 editorial Profile screen. Drop-in replacement for the legacy
// ProfileTab (cream/paper rows) — a full-bleed forest "plate" surface
// where the user's filter profile reads as an engraved credential.
//
// Port of design source: ~/Downloads/ProfileV3.jsx (May 17). All globals
// from the design canvas (t(), F.*, COUNTRIES, window.PROFILE_DATA) are
// rewired to real module imports and the live profile shape.
//
// Section "EDIT" buttons route through onEditSection(stepId) which the
// host wires to the existing Onboarding edit flow (setEditingProfile +
// setEditProfileStep + setStep("onboard")).

import React from "react";
import { createPortal } from "react-dom";
import { COUNTRY_MAP } from "../../../data/countries.js";

const C = {
  ink:        "#1A2E1A",
  inkDeep:    "#0F1F0F",
  inkMid:     "#152715",
  inkRich:    "#1F3520",
  dot:        "#fbbf24",
  onDarkInk:  "#EDF2EC",
  onDarkSoft: "#C8D4C5",
  onDarkMono: "#7A9A7A",
  onDarkEyebrow:      "#5A7A5A",
  onDarkBorder:       "rgba(232,240,232,0.16)",
  onDarkBorderStrong: "rgba(232,240,232,0.30)",
  onDarkGold:         "rgba(212,188,82,0.55)",
  onDarkGoldStrong:   "rgba(212,188,82,0.78)",
  onDarkGoldSoft:     "rgba(212,188,82,0.28)",
  onDarkCream:        "rgba(232,240,232,0.06)",
  passSoft:           "#E89090",
};

const F = {
  serif: "var(--font-serif)",
  prose: "var(--font-prose)",
  data:  "var(--font-data)",
};

// ── Forest backdrop (radial halo + grain) ──────────────────────────────────
function Backdrop({ haloY = "22%" }) {
  return (
    <>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(130% 90% at 50% ${haloY}, ${C.inkRich} 0%, ${C.inkMid} 50%, ${C.inkDeep} 100%)`,
      }}/>
      <div style={{
        position: "absolute", top: haloY, left: "50%",
        width: 520, height: 520, transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.04) 35%, transparent 65%)",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, rgba(232,240,232,0.014) 0 1px, transparent 1px 2px),
                          repeating-linear-gradient(90deg, rgba(232,240,232,0.012) 0 1px, transparent 1px 2px)`,
        mixBlendMode: "overlay",
      }}/>
    </>
  );
}

function EditArrow({ color }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M2 1.5L6 4.5L2 7.5" stroke={color} strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DarkHamburger({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Menu" style={{
      width: 44, height: 44, background: "transparent", border: "none",
      cursor: "pointer", display: "inline-flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        <line x1="0" y1="2"  x2="20" y2="2"  stroke={C.onDarkSoft} strokeWidth="1.5"/>
        <line x1="0" y1="7"  x2="20" y2="7"  stroke={C.onDarkSoft} strokeWidth="1.5"/>
        <line x1="0" y1="12" x2="20" y2="12" stroke={C.onDarkSoft} strokeWidth="1.5"/>
      </svg>
    </button>
  );
}

function PlateStat({ label, big, unit, accent }) {
  return (
    <div>
      <div style={{
        fontFamily: F.data, fontSize: 9, fontWeight: 500,
        letterSpacing: "0.22em", color: C.onDarkEyebrow,
        textTransform: "uppercase", marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: F.prose, fontSize: 28, fontWeight: 600,
        color: accent ? C.dot : C.onDarkInk, lineHeight: 1,
        letterSpacing: "-0.025em", whiteSpace: "nowrap",
      }}>
        {big}
        {unit && <span style={{ fontSize: 15, color: C.onDarkMono, marginLeft: 1 }}>{unit}</span>}
      </div>
    </div>
  );
}

function Section({ label, onEdit, children, editLabel = "EDIT" }) {
  return (
    <section style={{ marginTop: 26 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
      }}>
        <div style={{
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.22em", color: C.dot,
          textTransform: "uppercase",
        }}>{label}</div>
        <div style={{ flex: 1, height: 0.5, background: C.onDarkBorder }}/>
        <button onClick={onEdit} aria-label={`Edit ${label}`} style={{
          background: "transparent", border: "none", cursor: "pointer",
          padding: "4px 0 4px 8px", display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.18em", color: C.onDarkMono,
          textTransform: "uppercase",
        }}>{editLabel} <EditArrow color={C.onDarkMono}/></button>
      </div>
      {children}
    </section>
  );
}

function None({ label = "Not set" }) {
  return (
    <div style={{
      fontFamily: F.prose, fontSize: 14, fontStyle: "italic",
      color: C.onDarkMono,
    }}>{label}</div>
  );
}

function Tags({ items, emptyLabel }) {
  if (!items?.length) return <None label={emptyLabel}/>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((item, i) => (
        <span key={`${item}-${i}`} style={{
          padding: "6px 12px", borderRadius: 20,
          background: C.onDarkCream,
          border: `0.5px solid ${C.onDarkBorder}`,
          fontFamily: F.prose, fontSize: 13, color: C.onDarkInk,
        }}>{item}</span>
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtCompK(v) {
  const n = parseFloat(v);
  if (!n || n <= 0) return "—";
  const k = n >= 1000 ? Math.round(n / 1000) : Math.round(n);
  return `$${k}`;
}

function asArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    return v.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// ══════════════════════════════════════════════════════════════════════════
// ProfileLanding — full-bleed forest plate. Read-only view; section EDIT
// buttons fire onEditSection(stepId) so the host can route to the existing
// onboarding edit flow.
//
// Props:
//   profile      live profile object from App state
//   authUser     { displayName, email }
//   userTier     "free" | "signal" | "vantage" (+ _lifetime variants)
//   onOpenMenu   open the hamburger menu
//   onUpgrade    open the paywall
//   onEditSection(stepId)  route to onboarding edit step
//   onSignOut    sign-out handler
//   t            translations object (with English fallback)
// ══════════════════════════════════════════════════════════════════════════
export default function ProfileLanding({
  profile = {},
  authUser,
  userTier,
  onOpenMenu,
  onUpgrade,
  onEditSection,
  onSignOut,
  t = {},
}) {
  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";
  const isSignal  = userTier === "signal"  || userTier === "signal_lifetime";
  const tierLabel = isVantage ? "VANTAGE" : isSignal ? "SIGNAL" : (t.tierFree || "FREE");

  const handleEdit = (id) => onEditSection?.(id);

  const country = profile.country ? COUNTRY_MAP[profile.country] : null;

  const rawName  = authUser?.displayName && authUser.displayName !== "User"
    ? authUser.displayName
    : (profile.name || "You");
  const title    = profile.currentTitle || "";
  const goal     = profile.careerGoal || "";
  const targets  = asArray(profile.targetRoles);
  const inds     = asArray(profile.targetIndustries);
  const locs     = asArray(profile.locationPrefs);
  const hardNos  = asArray(profile.hardConstraints);
  const timingOpt = (t.timelineOptions || []).find(o => o.value === profile.timeline);
  const timing   = timingOpt?.label || profile.timeline || (t.profileNotSet || "Not set");

  const editLabel = (t.profileEdit || "EDIT").toUpperCase();

  const body = (
    <div style={{
      // Portal-rendered onto document.body so the forest backdrop covers
      // the iOS safe-area top/bottom and the centered #root border on
      // larger viewports. Edge-to-edge plate, no paper bleeding through.
      position: "fixed", inset: 0,
      width: "100vw", height: "100dvh",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      background: "#0F1F0F",
      zIndex: 40,
    }}>
      <Backdrop haloY="22%"/>

      {/* Top bar — VETTED + hamburger, on ink. Top padding clears the
          iOS notch via safe-area inset. */}
      <header style={{
        position: "relative", flex: "0 0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
        paddingRight: 8, paddingBottom: 6, paddingLeft: 20,
      }}>
        <div style={{
          fontFamily: F.data, fontSize: 11, letterSpacing: "0.18em",
          color: C.onDarkSoft, textTransform: "uppercase",
        }}>VETTED</div>
        <DarkHamburger onClick={onOpenMenu}/>
      </header>

      {/* Scrollable plate. Bottom padding clears the floating tab bar
          (~58px) + the iOS home indicator safe-area. */}
      <div style={{
        position: "relative", flex: 1, overflow: "auto",
        paddingTop: 18, paddingRight: 24, paddingLeft: 24,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)",
      }}>

        {/* Eyebrow */}
        <div style={{
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.24em", color: C.onDarkEyebrow,
          textTransform: "uppercase", marginBottom: 10,
        }}>
          {(t.profileEyebrow || "Profile").toUpperCase()} · {(t.profileFieldYourPlate || "Your Filter Plate").toUpperCase()}
        </div>

        {/* Name */}
        <h1 style={{
          margin: 0, fontFamily: F.prose, fontSize: 36, fontWeight: 600,
          color: C.onDarkInk, lineHeight: 1.05, letterSpacing: "-0.025em",
        }}>{rawName}</h1>
        {title && (
          <div style={{
            marginTop: 6, fontFamily: F.prose, fontStyle: "italic",
            fontSize: 16, color: C.onDarkSoft, lineHeight: 1.35,
          }}>{title}</div>
        )}

        {/* Tier + country row */}
        <div style={{
          marginTop: 14, display: "flex", alignItems: "center", gap: 10,
          flexWrap: "wrap",
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.20em", color: C.onDarkMono, textTransform: "uppercase",
        }}>
          <button onClick={onUpgrade} style={{
            padding: "5px 12px", borderRadius: 20,
            background: "rgba(212,188,82,0.18)",
            border: `0.5px solid ${C.onDarkGold}`,
            color: C.dot, cursor: "pointer",
            fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit",
            letterSpacing: "inherit", textTransform: "inherit",
          }}>
            {tierLabel}
            {!isVantage && (
              <span> · {(t.profileUpgradeArrow || "Upgrade →").toUpperCase()}</span>
            )}
          </button>
          {country && <>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{country.flag}</span>
            <span>{country.name}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{country.currency}</span>
          </>}
        </div>

        {/* Anchor-line manifesto — career goal as the user's own quote */}
        {goal ? (
          <div style={{ marginTop: 28, position: "relative" }}>
            <div style={{
              fontFamily: F.prose, fontSize: 28, color: C.onDarkGold,
              lineHeight: 0.4, marginBottom: 8,
            }}>&ldquo;</div>
            <div style={{
              fontFamily: F.prose, fontStyle: "italic", fontSize: 17,
              lineHeight: 1.5, color: C.onDarkInk,
              letterSpacing: "-0.005em", textWrap: "pretty",
            }}>{goal}</div>
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", justifyContent: "flex-end",
              gap: 8, fontFamily: F.data, fontSize: 9, fontWeight: 500,
              letterSpacing: "0.22em", color: C.onDarkEyebrow, textTransform: "uppercase",
            }}>
              <span>— {(t.profileFieldOptimizing || "Optimizing For").toUpperCase()}</span>
              <button onClick={() => handleEdit("careerGoal")} aria-label="Edit goals" style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 0, color: C.onDarkMono,
                display: "inline-flex", alignItems: "center",
              }}>
                <EditArrow color={C.onDarkMono}/>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 28 }}>
            <Section label={(t.profileFieldOptimizing || "Optimizing For").toUpperCase()}
                     onEdit={() => handleEdit("careerGoal")}
                     editLabel={editLabel}>
              <None label={t.profileNoneSet || "Add a career goal to anchor your filter plate."}/>
            </Section>
          </div>
        )}

        {/* Engraved numerals — compensation + timing.
            EDIT button moved to a dedicated header row above the strip so
            it stops crowding the "WANTS TO LAND" label in the third
            column. */}
        <div style={{
          marginTop: 28, paddingTop: 14,
          borderTop: `0.5px solid ${C.onDarkBorderStrong}`,
          display: "flex", justifyContent: "flex-end",
        }}>
          <button onClick={() => handleEdit("compensationMin")} aria-label="Edit compensation" style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: 0, color: C.onDarkMono,
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: F.data, fontSize: 9, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>{editLabel} <EditArrow color={C.onDarkMono}/></button>
        </div>
        <div style={{
          paddingTop: 10, paddingBottom: 22,
          borderBottom: `0.5px solid ${C.onDarkBorderStrong}`,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          alignItems: "end",
        }}>
          <PlateStat label={(t.profileFieldCompMin || "Floor").toUpperCase()}
                     big={fmtCompK(profile.compensationMin)} unit="k"/>
          <PlateStat label={(t.profileFieldCompTarget || "Target").toUpperCase()}
                     big={fmtCompK(profile.compensationTarget)} unit="k" accent/>
          <PlateStat label={(t.profileFieldWantsToLand || "Wants to land").toUpperCase()}
                     big={timing}/>
        </div>

        {/* Target roles */}
        <Section label={(t.profileFieldRoles || "Target Roles").toUpperCase()}
                 onEdit={() => handleEdit("targetRoles")}
                 editLabel={editLabel}>
          <Tags items={targets} emptyLabel={t.profileNoneSet || "Not set"}/>
        </Section>

        {/* Industries */}
        <Section label={(t.profileFieldIndustries || "Industries").toUpperCase()}
                 onEdit={() => handleEdit("targetIndustries")}
                 editLabel={editLabel}>
          <Tags items={inds} emptyLabel={t.profileNoneSet || "Not set"}/>
        </Section>

        {/* Location */}
        <Section label={(t.profileFieldLocation || "Location").toUpperCase()}
                 onEdit={() => handleEdit("locationPrefs")}
                 editLabel={editLabel}>
          {locs.length === 0
            ? <None label={t.profileNoneSet || "Not set"}/>
            : <div style={{
                fontFamily: F.prose, fontStyle: "italic", fontSize: 16,
                color: C.onDarkInk, lineHeight: 1.4,
              }}>{locs.join(" · ")}</div>}
        </Section>

        {/* Hard NOs */}
        <Section label={(t.profileFieldHardNos || "Hard NOs").toUpperCase()}
                 onEdit={() => handleEdit("hardConstraints")}
                 editLabel={editLabel}>
          {hardNos.length === 0
            ? <None label={t.profileNoneSet || "Not set"}/>
            : <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {hardNos.map((h, i) => (
                  <li key={`${h}-${i}`} style={{
                    padding: "8px 0", display: "flex", alignItems: "baseline", gap: 12,
                    borderBottom: i === hardNos.length - 1
                      ? "none" : `0.5px solid ${C.onDarkBorder}`,
                    fontFamily: F.prose, fontSize: 14, color: C.onDarkInk,
                  }}>
                    <span style={{
                      color: C.dot, fontFamily: F.data,
                      fontSize: 11, fontWeight: 500, minWidth: 12,
                    }}>×</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>}
        </Section>

        {/* Experience */}
        <Section label={(t.profileFieldBackground || "Experience").toUpperCase()}
                 onEdit={() => handleEdit("background")}
                 editLabel={editLabel}>
          {profile.background ? (
            <p style={{
              margin: 0, fontFamily: F.prose, fontSize: 14,
              lineHeight: 1.6, color: C.onDarkSoft,
            }}>{profile.background}</p>
          ) : <None label={t.profileNoneSet || "Not set"}/>}
        </Section>

        {/* Footer engraving */}
        <div style={{
          marginTop: 32, paddingTop: 16,
          borderTop: `0.5px solid ${C.onDarkBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.22em", color: C.onDarkEyebrow, textTransform: "uppercase",
        }}>
          <span>{t.profileEstYear || "EST. 2025"}</span>
          <span>VETTED · {tierLabel}</span>
        </div>

        {onSignOut && (
          <button onClick={onSignOut} style={{
            marginTop: 18, padding: "14px 0", minHeight: 48,
            width: "100%", textAlign: "center",
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: F.data, fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", color: C.passSoft,
            textTransform: "uppercase",
          }}>{t.signOut || "Sign Out"}</button>
        )}
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(body, document.body) : body;
}
