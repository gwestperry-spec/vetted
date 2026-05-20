# Build 30 · App Store Submission Checklist

Version: **2026.05.001** · Build: **30** · Bundle: **com.vettedai.app**

Versioning scheme: date-based (`YYYY.MM.NNN`). `2026.05.001` = first
build shipped in May 2026. Apple compares versions component-by-
component, so `2026.05.001` cleanly supersedes the prior `2.2.4`
release. Build number (`CURRENT_PROJECT_VERSION`) stays sequential at
`30` and increments by 1 per submission.

---

## Release notes (App Store "What's New" — paste verbatim, 4000 char limit)

```
Build 30 — Editorial Redesign

Vetted's full surface in a new editorial vocabulary. Forest backdrops for
the moments that ask you to decide; paper for the moments that ask you
to act. One serif type voice across every screen.

  • Resolve hub — every score lands on a paused verdict seal with the
    number at center, verdict pill, and a four-pill grid (Insights,
    Filters, Coach, Pay) ready when you want to read deeper.
  • Workspace door — single-screen layout, role history scrolls inside.
    The day's headline first; everything else one tap away.
  • Behavioral Insights pod — patterns the app has noticed about your
    decisions: floor margin, filter signal, preference drift, this-week
    synthesis. Swipe between cards.
  • Market Pulse cohort plate — your own scored roles form your cohort.
    P25 / median / P75, your target plotted across the band, live
    findings from Robert Half / BLS / Perplexity Sonar.
  • Profile plate — your filter framework as a credential. Career goal
    becomes the anchor line; comp and timing engraved across the plate.
  • Scoring ritual — a rotating verdict seal, cycling anchor pairs, and
    a four-step trail. Eight seconds, no progress-bar theater.
  • Cover Letter — Save to draft, Copy to clipboard, Regenerate works
    even after a model hiccup. Drafts persist per role.

Plus: TimeRangeChip filter on Workspace now actually filters; URLs
that won't fetch route through the Share Extension instead of long-
press copy; cover-letter retries transient model errors with a clean
message; iOS Sign in with Apple now sits on the same forest world as
the scoring screen.
```

---

## App Privacy disclosure (App Store Connect → App Privacy)

Set the following data types under **Data Collected**:

### Identifiers
- **Device ID** — Linked to user · **Analytics** purpose
  - SDK: Firebase Analytics — required by GA4
- **User ID** — Linked to user · **App Functionality** purpose
  - Source: Apple Sign in opaque user ID

### Usage Data
- **Product Interaction** — Linked to user · **Analytics**
  - Events tracked: `sign_in`, `score_started`, `score_completed`,
    `screen_view`, `paywall_opened`, `paywall_purchase`, `coach_drafted`
- **Other Usage Data** — NOT collected

### Diagnostics
- **Crash Data** — Not linked to user · **App Functionality**
- **Performance Data** — Not linked to user · **Analytics**
  - From Firebase Analytics + Capacitor crash reporting

### Contact Info
- **Email Address** — Linked to user · **App Functionality**
  - From Apple Sign in (when user shares email)

### User Content
- **Other User Content** — Linked to user · **App Functionality**
  - Job descriptions pasted into the app, cover letter drafts stored
    locally only

### Financial Info
- NONE — payments handled by Apple StoreKit; no card / bank data ever
  touches Vetted servers.

### Sensitive Info / Health / Location / Browsing / Search History / Contacts / Photos
- NONE.

Mark all data as **Used to track users: NO** unless you launch
attribution-based ad campaigns (then revisit when you do).

---

## App Store screenshots — what to capture and upload

Need **6.7" (iPhone 15/16 Pro Max)** and optionally **6.1" (iPhone
15/16)**. Apple infers smaller sizes; you don't have to upload all.

Take 6 screenshots, in this order — they tell the brand story:

1. **Sign-in screen** — forest, seal animating, "Vetted · Career
   Intelligence" + tagline.
2. **Resolve hub** — paused seal with a 4.4 PURSUE result, verdict
   pill + italic rationale below + 4-pill grid.
3. **Scoring ritual** — rotating seal mid-scoring with an anchor pair
   line displayed.
4. **Workspace door** — KPI tiles + headline + behavioral pod +
   top match card + score history.
5. **Market Pulse cohort plate** — dark plate with P25 / median /
   P75 numerals + horizontal cohort bar + live findings card visible
   below.
6. **Profile plate** — name + tier + manifesto quote + engraved
   compensation stats.

Suggested capture sequence:
```
# In iOS Simulator:
xcrun simctl io booted screenshot ~/Desktop/v30-screenshot-1.png
# Repeat for each frame, name 1 through 6
```

Strip the status bar before upload (App Store Connect rejects screenshots
with cellular bars in some cases). Use Apple's "App Store Screenshot"
template in Sketch / Figma / Pages if you want chrome overlays.

---

## Submission checklist (work top to bottom)

- [x] Bump version to 2026.05.001 / build 30 — **DONE**
- [ ] Confirm App Privacy disclosure (see above)
- [ ] Capture 6 screenshots from a real device (or release simulator)
- [ ] Write App Store Connect "What's New" using release notes above
- [ ] Test on a physical device one more time — score → resolve →
      cover letter → workspace → profile cycle
- [ ] Archive in Xcode (Product → Archive)
- [ ] Upload to TestFlight via Xcode Organizer
- [ ] Smoke-test the TestFlight build on a separate device (gives
      external testers immediate access and lets you confirm push,
      sign-in, IAP flow on a clean install)
- [ ] Submit for App Store Review from App Store Connect with the
      already-uploaded build selected
- [ ] After approval: check "Provided by Vetted AI LLC" updates on the
      live listing (entity transfer follow-through)
