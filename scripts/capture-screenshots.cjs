// Captures App Store screenshots from the dev server (must be running on :5173)
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "../screenshots");
fs.mkdirSync(OUT, { recursive: true });

const ROLES = [
  { role_id: "r1", title: "Chief Operating Officer", company: "Notion", vq_score: 4.6, created_at: new Date().toISOString(), framework_snapshot: { recommendation: "pursue", signals: [] } },
  { role_id: "r2", title: "VP Revenue Operations", company: "Stripe", vq_score: 4.2, created_at: new Date().toISOString(), framework_snapshot: { recommendation: "pursue", signals: [] } },
  { role_id: "r3", title: "VP People", company: "Vercel", vq_score: 4.1, created_at: new Date().toISOString(), framework_snapshot: { recommendation: "pursue", signals: [] } },
  { role_id: "r4", title: "Head of Strategic Finance", company: "Figma", vq_score: 3.6, created_at: new Date().toISOString(), framework_snapshot: { recommendation: "consider", signals: [] } },
  { role_id: "r5", title: "Director of Strategy", company: "Linear", vq_score: 2.8, created_at: new Date().toISOString(), framework_snapshot: { recommendation: "pass", signals: [] } },
];

// iPhone 15 Pro dimensions (6.1" display, 1179×2556 logical → 393×852 CSS px)
const VIEWPORT = { width: 393, height: 852 };

async function injectPreview(page) {
  await page.evaluate((roles) => {
    localStorage.setItem("vetted_preview_mode", "true");
    localStorage.setItem("vetted_preview_tier", "vantage");
    localStorage.setItem("vetted_preview_roles", JSON.stringify({ roles, reminders: [] }));
    localStorage.setItem("vetted_user", JSON.stringify({ id: "preview-user-001", displayName: "Sarah Chen" }));
  }, ROLES);
  await page.reload({ waitUntil: "networkidle" });
  // dismiss onboarding dialogs if present
  await page.evaluate(() => {
    // quick-start modal
    const skip = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Skip for now");
    skip?.click();
    // workspace guide carousel (has an aria-label="Close guide" button)
    const close = document.querySelector('button[aria-label="Close guide"]');
    close?.click();
  });
  await page.waitForTimeout(500);
}

async function clickTab(page, label) {
  await page.evaluate((label) => {
    const btn = Array.from(document.querySelectorAll("nav button")).find(b => b.textContent.includes(label));
    btn?.click();
  }, label);
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
  const page = await context.newPage();

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // 1. Sign-in screen
  await page.screenshot({ path: `${OUT}/01-sign-in.png`, fullPage: false });
  console.log("✓ 01-sign-in.png");

  // Inject preview state
  await injectPreview(page);

  // 2. Workspace — headline + KPIs + VQ Advocate + Top Match
  await clickTab(page, "WORKSPACE");
  await page.screenshot({ path: `${OUT}/02-workspace.png`, fullPage: false });
  console.log("✓ 02-workspace.png");

  // 3. Score tab
  await clickTab(page, "SCORE");
  await page.screenshot({ path: `${OUT}/03-score.png`, fullPage: false });
  console.log("✓ 03-score.png");

  // 4. Filters tab
  await clickTab(page, "FILTERS");
  await page.screenshot({ path: `${OUT}/04-filters.png`, fullPage: false });
  console.log("✓ 04-filters.png");

  // 5. Profile tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("nav button")).find(b => b.textContent.trim() === "PROFILE");
    btn?.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-profile.png`, fullPage: false });
  console.log("✓ 05-profile.png");

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT}`);
})();
