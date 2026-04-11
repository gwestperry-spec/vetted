// ─── VQ Score PDF / Print Export ──────────────────────────────────────────
// Generates a styled HTML document from a scored opportunity and opens it
// in a new window. On web, the browser print dialog allows "Save as PDF".
// On iOS Capacitor, the WKWebView opens the document and the native share
// button (top-right) allows Save to Files, AirDrop, Mail, etc.

const WEIGHT_LABELS = {
  0.5: "Minor", 1.0: "Standard", 1.2: "Relevant",
  1.3: "Important", 1.5: "Critical", 2.0: "Critical +",
};

function scoreColor(score) {
  if (score >= 4) return "#0d5c2e";
  if (score >= 3) return "#8a6200";
  return "#8b1a1a";
}

function dots(score) {
  const filled = Math.round(score);
  return [1, 2, 3, 4, 5].map(n =>
    `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:3px;background:${n <= filled ? scoreColor(score) : "#d0cdc8"};"></span>`
  ).join("");
}

export async function exportOpportunityPdf(opp, profile) {
  const rec = opp.recommendation || "monitor";
  const recColors = { pursue: "#0d5c2e", monitor: "#8a6200", pass: "#8b1a1a" };
  const recBg    = { pursue: "#c8edda", monitor: "#fdf3e0", pass: "#f0d8d8" };
  const recColor = recColors[rec] || "#333";
  const recBgCol = recBg[rec] || "#f5f5f5";

  const filterRows = (opp.filter_scores || []).map(fs => {
    const weightLabel = WEIGHT_LABELS[fs.weight] || (fs.weight ? `${fs.weight}×` : "");
    return `
      <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e8e8e0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-weight:600;font-size:14px;">${fs.filter_name || ""}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${weightLabel ? `<span style="font-size:10px;color:#3a3a3a;font-family:monospace;font-weight:600;">${weightLabel}</span>` : ""}
            <span style="font-size:13px;font-weight:700;color:${scoreColor(fs.score)}">${fs.score}/5</span>
          </div>
        </div>
        <div style="margin-bottom:8px;">${dots(fs.score)}</div>
        <div style="height:4px;background:#e8e8e0;border-radius:2px;margin-bottom:8px;">
          <div style="height:100%;width:${(fs.score / 5) * 100}%;background:${scoreColor(fs.score)};border-radius:2px;"></div>
        </div>
        <p style="font-size:12px;color:#555;line-height:1.6;margin:0;">${fs.rationale || ""}</p>
      </div>`;
  }).join("");

  const strengthsList = (opp.strengths || []).map(s =>
    `<li style="margin-bottom:6px;">${s}</li>`
  ).join("");

  const gapsList = (opp.gaps || []).map(g =>
    `<li style="margin-bottom:6px;">${g}</li>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VQ Report — ${opp.role_title || "Opportunity"} at ${opp.company || ""}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; color: #0f0e0c; background: #fff; padding: 48px 40px; max-width: 760px; margin: 0 auto; font-size: 14px; line-height: 1.6; }
    h1 { font-family: 'Inter', -apple-system, sans-serif; font-size: 28px; font-weight: 600; margin-bottom: 4px; }
    h2 { font-family: 'Inter', -apple-system, sans-serif; font-size: 18px; font-weight: 600; margin-bottom: 14px; }
    .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #3a3a3a; margin-bottom: 8px; }
    .section { margin-bottom: 32px; }
    .divider { border: none; border-top: 1px solid #e0ddd8; margin: 28px 0; }
    .narrative { background: #f5f5f0; border-left: 3px solid #0d5c2e; padding: 14px 16px; border-radius: 2px; font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
    .narrative.gold { border-left-color: #8a6200; }
    ul { padding-left: 18px; }
    li { font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0ddd8; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; letter-spacing: .1em; text-transform: uppercase; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 24px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="eyebrow">Vetted Quotient Report</div>
    <p style="font-size:11px;color:#3a3a3a;font-family:'IBM Plex Mono',monospace;margin-bottom:12px;">${opp.company || ""}</p>
    <h1>${opp.role_title || "Unknown Role"}</h1>

    <div style="display:flex;align-items:center;gap:20px;margin-top:20px;flex-wrap:wrap;">
      <div style="text-align:center;">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:52px;font-weight:500;color:${scoreColor(opp.overall_score)};line-height:1;">${(opp.overall_score || 0).toFixed(1)}</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3a3a3a;letter-spacing:.1em;text-transform:uppercase;margin-top:4px;">VQ Score</div>
      </div>
      <div>
        <span style="display:inline-flex;align-items:center;padding:8px 18px;border-radius:4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border:1.5px solid ${recColor};color:${recColor};background:${recBgCol};">${rec}</span>
        <p style="font-size:11px;color:#3a3a3a;margin-top:6px;">Threshold: ${profile.threshold} — ${opp.overall_score >= profile.threshold ? "Above threshold" : "Below threshold"}</p>
      </div>
    </div>
  </div>

  <hr class="divider">

  <div class="section">
    <div class="narrative"><strong>Recommendation Rationale</strong><br>${opp.recommendation_rationale || ""}</div>
    <div class="narrative gold"><strong>Honest Fit Assessment</strong><br>${opp.honest_fit_summary || ""}</div>
  </div>

  <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div>
      <h2>Where You Are Strong</h2>
      <ul>${strengthsList}</ul>
    </div>
    <div>
      <h2>Real Gaps</h2>
      <ul>${gapsList}</ul>
    </div>
  </div>

  <hr class="divider">

  <div class="section">
    <h2>Filter Breakdown</h2>
    ${filterRows}
  </div>

  ${opp.narrative_bridge ? `
  <hr class="divider">
  <div class="section">
    <h2>Narrative Bridge</h2>
    <p style="font-size:13px;line-height:1.8;color:#444;">${opp.narrative_bridge}</p>
  </div>` : ""}

  <div class="footer">
    <span>Vetted: Career Intelligence — tryvettedai.com</span>
    <span>Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
  </div>
</body>
</html>`;

  const isNative = window.Capacitor?.isNativePlatform?.() === true;

  if (isNative) {
    // window.print() is a silent no-op in Capacitor WKWebView — Apple never
    // wired it to a UI action. PrintPlugin.swift bridges to UIMarkupTextPrintFormatter
    // + UIPrintInteractionController, which shows the native iOS share/print sheet.
    const PrintPlugin = window.Capacitor?.Plugins?.PrintPlugin;
    if (PrintPlugin) {
      try {
        await PrintPlugin.printHTML({
          html,
          jobName: `${opp.role_title || "Role"} at ${opp.company || "Company"} — VQ Report`,
        });
      } catch (err) {
        console.warn("PrintPlugin error:", err);
      }
    } else {
      console.warn("PrintPlugin not available — check AppDelegate registration");
    }

  } else {
    // Web: open in new tab, trigger print dialog after fonts load
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => {
          win.print();
          URL.revokeObjectURL(url);
        }, 600);
      };
    }
  }
}
