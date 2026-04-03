# Vetted AI — Environment Variables

All variables must be present before deploying. Missing any variable will cause silent failures in production.

## Netlify Environment Variables
Set in: Netlify → Site Settings → Environment Variables

| Variable | Used In | What Breaks Without It |
|---|---|---|
| `ANTHROPIC_API_KEY` | `netlify/functions/anthropic.js` | All VQ scoring fails silently |
| `VETTED_SECRET` | `netlify/functions/anthropic.js`, `apple-auth.js`, `supabase.js` | All API calls return 403 Forbidden |
| `VITE_VETTED_SECRET` | `src/App.jsx` (baked in at build time) | Frontend sends empty token, all API calls blocked |

cat > ~/Desktop/vetted/DEPLOY.md << 'EOF'
# Vetted AI — Release Checklist

Complete every step in order before submitting to App Store.
No exceptions. Each skipped step has previously caused a broken build.

## Pre-Deploy Checklist

### Code
- [ ] All changes committed and pushed to main
- [ ] `npm run build` completes clean with zero errors
- [ ] No hardcoded URLs in App.jsx (verify: `grep -n "celebrated-gelato" src/App.jsx`)
- [ ] No console.log debug statements left in App.jsx
- [ ] ENDPOINTS imported from config.js for all API calls

### Environment
- [ ] `VITE_VETTED_SECRET` set in Netlify and matches `VETTED_SECRET`
- [ ] `ANTHROPIC_API_KEY` present in Netlify
- [ ] All Apple auth variables present (CLIENT_ID, TEAM_ID, KEY_ID, PRIVATE_KEY)
- [ ] Supabase URL and service key present

### Netlify
- [ ] Latest deploy shows Published (green)
- [ ] Deploy was triggered without cache after any env var change
- [ ] Functions tab shows anthropic, apple-auth, supabase all present
- [ ] Test VQ scoring on Netlify web preview before archiving

### iOS Build
- [ ] `npx cap copy ios` run after `npm run build`
- [ ] Version number incremented correctly
- [ ] Build number incremented correctly (never reuse a build number)
- [ ] Target set to Any iOS Device (arm64) — not a simulator or personal device
- [ ] Product → Clean Build Folder (Cmd+Shift+K) before archive
- [ ] Product → Archive completes with zero errors

### Device Test (required before every submission)
- [ ] Sideload via Xcode to physical iPhone
- [ ] Sign in with Apple completes successfully
- [ ] Complete profile setup end to end
- [ ] Score one full opportunity — VQ returns without error
- [ ] Sign out and sign back in — no race condition error

### App Store Connect
- [ ] Upload via Organizer → Distribute → App Store Connect
- [ ] Build appears in TestFlight within 10 minutes
- [ ] Encryption compliance answered (No)
- [ ] Correct build selected in App Store version
- [ ] Previous in-review build cancelled if superseding
- [ ] What to Test field completed
- [ ] Submit for Review

## Build History
| Version | Build | Status | Key Change |
|---|---|---|---|
| 1.0 | 1 | Superseded | Initial launch |
| 1.0.1 | 2 | Superseded | iOS absolute URL fix |
| 1.2 | 3 | Superseded | Sign in with Apple, Supabase, security |
| 1.3 | 4 | Live | iOS 26 presentationAnchor fix |
| 1.4 | 5 | Cancelled | Superseded |
| 1.4 | 6 | Cancelled | 500 token truncation bug |
| 1.5 | 7 | In Review | max_tokens 2000 restored, token fix |
