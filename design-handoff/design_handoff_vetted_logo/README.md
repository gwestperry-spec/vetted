# Handoff: Vetted — Score Gauge V Logo

## Overview

This package contains the finalized logo mark for **Vetted**, an iOS app for tracking job applications. The mark is a stylized **V** rendered as a *score gauge* — the V's path is a track that fills from the upper-left, with a gold dot marking the live edge. It reads simultaneously as the brand initial, a checkmark, and a progress indicator, which mirrors the product's job: tracking a candidate's progress through a vetting pipeline.

## About the Design Files

The files in `source/` are **design references created in HTML/React** — a working prototype showing the intended look and behavior, not production code to copy directly. Your task is to recreate this mark in the target codebase's environment (SwiftUI for the iOS app, or React/Vue/whatever for marketing surfaces) using its established conventions and asset pipeline.

For raster app-icon export (1024×1024 master, plus all the iOS multipliers), render the SVG paths from `logo-marks.jsx` at the appropriate size — the geometry is fully parametric.

## Fidelity

**High-fidelity.** The mark has final geometry, colors, opacities, and corner radius. Every value below is intentional. Recreate it pixel-for-pixel.

## The Mark — Anatomy

The mark is a rounded square (iOS app icon) containing six visual layers, in z-order from back to front:

1. **Forest-green ground** — solid `#2d6a4f` fill across the entire rounded square.
2. **Vignette** — radial gradient from transparent at the center to `rgba(0,0,0,0.30)` at the corners. Starts at 55% of the radius. This gives the mark depth and pushes focus to center.
3. **Groove outline** — the full V path, stroked in `rgba(0,0,0,0.45)`, with stroke-width = `(stroke + max(2, stroke × 0.10))`. This is the etched edge of the gauge track — what makes the unfilled portion clearly readable.
4. **Groove** — the full V path on top of the outline, stroked in white at **10% opacity**. The dim white lives inside the dark outline.
5. **Fill** — the V path stroked in white at **93% opacity**, only drawn from the start to the live-tip position (controlled by `progress`, default 72%).
6. **Live tip** — a gold dot at the end of the fill, with a softer gold halo behind it.
   - Halo: gold `#fbbf24`, 35% opacity, radius = 2.0× the dot's radius.
   - Dot: gold `#fbbf24`, opaque, radius = 8.5% of the icon's width × ½.

### Groove style — `outlined`

The canonical mark uses `grooveStyle: 'outlined'`. Two other treatments exist in the source (`'plain'`, `'depth-light'`) — kept for reference, not used in production.

### V geometry (the canonical mark)

All values are **fractions of the icon's width**, so the mark scales cleanly to any size.

| Knob          | Value  | What it controls                                        |
|---------------|--------|---------------------------------------------------------|
| `vSpan`       | 0.50   | Horizontal span of the V (apex-to-corner × 2)            |
| `vTop`        | 0.32   | Y-coordinate of the V's top corners                      |
| `vBot`        | 0.78   | Y-coordinate of the V's apex                             |
| `strokeRel`   | 0.17   | Stroke width — thick, LinkedIn-letter ratio              |
| `dotSizeRel`  | 0.17   | Live-tip dot diameter                                    |
| `progress`    | 0.72   | Fraction of V drawn (live tip lands ~70% along right arm)|
| `cornerRel`   | 0.225  | iOS icon corner radius (continuous corner if available)  |
| `grooveStyle` | `outlined` | Groove treatment — see above                         |

The live tip lands on the **right arm** of the V (since progress > 50%), about 44% up from the apex, on the way back up to the upper-right corner.

### Stroke endcaps

`stroke-linecap: round` and `stroke-linejoin: round`. The rounded apex join and rounded fill terminus matter — the dot sits *inside* the rounded cap, so the cap visually frames the dot.

### Small-size compensations

At small render sizes the stroke is bumped to keep the V from disintegrating:

| Render size | `strokeRel` | `dotSizeRel` | `cornerRel` |
|-------------|-------------|--------------|-------------|
| ≥ 88px      | 0.17        | 0.17         | 0.225       |
| 40px        | 0.19        | 0.22         | 0.225       |
| 16px        | 0.22        | 0.30         | 0.18        |

For a 1024×1024 export, use the canonical values.

### Drop shadow (for marketing / display contexts only)

`box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22)` on the rounded-square wrapper. **Do not** apply this when exporting an iOS app-icon PNG — iOS draws its own ambient shadow.

## Design Tokens

```css
/* Brand color — forest green */
--brand-forest:        #2d6a4f;   /* canonical ground */
--brand-forest-hi:     #3a8462;   /* lighter forest (optional gradient stops) */
--brand-forest-lo:     #1f4d39;   /* darker forest (optional gradient stops) */

/* Mark internals */
--brand-white:         #ffffff;
--brand-white-fill:    rgba(255, 255, 255, 0.93);
--brand-white-groove:  rgba(255, 255, 255, 0.10);

/* Live-tip gold */
--brand-gold:          #fbbf24;   /* dot */
--brand-gold-warm:     #f5a623;   /* alternate tone */
--brand-gold-pale:     #ffd766;   /* alternate tone */

/* Effects */
--mark-vignette:       rgba(0, 0, 0, 0.30);  /* corner darkening */
--mark-shadow:         0 14px 40px rgba(0, 0, 0, 0.22);  /* outer drop shadow */

/* iOS icon corner */
--ios-corner-rel:      0.225;     /* fraction of side length */
```

## Files in `source/`

| File                  | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| `logo-marks.jsx`      | The `ScoreV` React component — fully parametric source of truth.        |
| `logo-explore.html`   | Page that renders the mark at multiple sizes, on a homescreen, and across width variations. |
| `design-canvas.jsx`   | Layout helpers used by the explore page (DesignCanvas / DCSection / DCArtboard). Not part of the mark — only there so `logo-explore.html` runs. |

The `ScoreV` component in `logo-marks.jsx` is the single source of truth — all the geometry, fills, and effects live there as plain SVG. Port it shape-for-shape.

## Implementation Notes

### SwiftUI

A `Path` with two line segments (corner → apex → corner), stroked **three** times in this z-order:
1. The groove outline — `Color.black.opacity(0.45)`, lineWidth = `stroke + max(2, stroke * 0.10)`, rounded caps/joins.
2. The dim groove — `Color.white.opacity(0.10)`, lineWidth = `stroke`, rounded caps/joins.
3. The fill — `Color.white.opacity(0.93)`, lineWidth = `stroke`, drawn via `trim(from: 0, to: progress)` so it only renders the first 72% of the path.

Then two `Circle`s for the gold halo and dot. Wrap in `RoundedRectangle(cornerRadius: side * 0.225, style: .continuous)` with `.clipped()`. The vignette is a `RadialGradient` overlay between the background fill and the groove outline.

### Web (React + SVG)

Lift `ScoreV` from `source/logo-marks.jsx` directly. It has no external dependencies beyond React. The unique-ID generation (for SVG `<defs>`) prevents collisions when multiple instances render on one page — keep that.

### App-icon export

Render `<ScoreV size={1024} showFrame={false} shadow={false} />` to a 1024×1024 PNG (no shadow, no rounded corner — Xcode handles the icon mask). Pre-multiplied alpha. Then let Xcode generate the smaller sizes, or render at each iOS multiplier directly using the small-size compensations from the table above.

## Verification

Open `source/logo-explore.html` in a browser. Section 01 shows the mark at display, app-icon, and the small-size range. Section 02 places it on a mock iOS homescreen next to real app icons. Section 03 shows the four width variations explored — **vSpan 0.50 (mid-narrow) is the chosen finalist**, second from the left in that row. Section 04 shows the three groove treatments — **`outlined` (rightmost) is the chosen finalist** and is what the canonical mark uses everywhere else.
