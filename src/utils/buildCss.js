// ─── CSS builder ──────────────────────────────────────────────────────────
// Generates the full app stylesheet as a string, injected via useEffect.
// dir: "ltr" | "rtl" — controls directional properties.
export const buildCss = (dir) => `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500&display=swap');
  :root {
    --ink:#1A2E1A;--paper:#FAFAF8;--cream:#F0F4F0;--accent:#3A7A3A;
    --accent-bg:rgba(58,122,58,0.08);--accent-border:rgba(58,122,58,0.3);
    --gold:#B8A030;--gold-light:#F8F4D8;--muted:#8A9A8A;--border:#D8E8D8;
    --success:#3A7A3A;--warn:#B8A030;--pass:#C05050;--pass-bg:#F8ECEC;
    --warn-bg:#FDF8E8;--shadow:none;--r:10px;
    --focus:0 0 0 3px rgba(58,122,58,0.25);
    --font-data:'IBM Plex Mono','Courier New',monospace;
    --font-prose:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  }
  *,::before,::after{box-sizing:border-box;margin:0;padding:0}
  html,body{scroll-behavior:smooth;overflow-x:hidden;max-width:100vw}
body{font-family:${dir === "rtl" ? "'Noto Sans Arabic'" : "var(--font-prose)"};background:var(--paper);color:var(--ink);min-height:100vh;direction:${dir};overflow-x:hidden}
*{box-sizing:border-box;min-width:0}
  .skip-link{position:absolute;top:-100px;left:0;padding:8px 16px;background:var(--ink);color:#fff;font-size:14px;border-radius:0 0 var(--r) 0;z-index:9999;transition:top .15s}
  .skip-link:focus{top:0;outline:3px solid #4a90e2}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .app{max-width:860px;margin:0 auto;padding:max(env(safe-area-inset-top,44px),44px) 16px 80px;background:var(--paper);min-height:100vh;overflow-x:hidden;box-sizing:border-box;width:100%}
  .header{text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)}
  .header-eyebrow{font-family:var(--font-data);font-size:10px;letter-spacing:.10em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
  .header h1{font-family:var(--font-prose);font-size:clamp(36px,7vw,56px);font-weight:700;line-height:1.1;letter-spacing:-.02em;margin-bottom:12px}
  .header h1 span{color:var(--accent)}.header-tagline{font-size:18px;color:var(--ink);margin-top:8px;line-height:1.4;opacity:0.7}
  .header p{color:var(--muted);font-size:15px;max-width:520px;margin:0 auto;line-height:1.7}
  .lang-switcher{display:flex;gap:4px;justify-content:center;margin-top:16px;margin-bottom:0;flex-wrap:wrap}
  .lang-btn{padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;font-size:12px;cursor:pointer;color:var(--muted);font-family:inherit;transition:all .15s}
  .lang-btn.active{background:var(--ink);color:#fff;border-color:var(--ink)}
  .lang-btn:hover:not(.active){border-color:var(--muted);color:var(--ink)}
  .lang-btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .progress-bar{display:flex;gap:6px;margin-bottom:40px;align-items:center}
  .progress-step{flex:1;height:4px;background:var(--border);border-radius:2px;transition:background .3s}
  .progress-step.active{background:var(--accent)}.progress-step.done{background:var(--ink)}
  .progress-label{font-family:var(--font-data);font-size:10px;color:var(--muted);letter-spacing:.1em;white-space:nowrap;${dir === "rtl" ? "margin-right:10px" : "margin-left:10px"}}
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:28px 32px;margin-bottom:20px}
  .card-title{font-family:var(--font-prose);font-size:20px;font-weight:600;color:#1A2E1A;margin-bottom:6px;word-break:break-word;overflow-wrap:break-word}
  .card-subtitle{font-size:13px;color:#5A6A5A;margin-bottom:24px;line-height:1.6}
  .field{margin-bottom:20px}
  .field label{display:block;font-size:13px;font-weight:500;color:#4a4540;margin-bottom:7px}
  .field .hint{font-size:12px;color:var(--muted);margin-bottom:6px}
  .field input,.field textarea,.field select{width:100%;padding:10px 14px;min-height:44px;border:1.5px solid var(--border);border-radius:var(--r);font-family:inherit;font-size:15px;color:var(--ink);background:var(--paper);transition:border-color .2s;outline:none;text-align:${dir === "rtl" ? "right" : "left"};direction:${dir}}
  .field input:focus,.field textarea:focus,.field select:focus{border-color:#4a90e2;box-shadow:var(--focus)}
  .field input[aria-invalid="true"],.field textarea[aria-invalid="true"]{border-color:var(--accent)}
  .field textarea{resize:vertical;min-height:100px;line-height:1.6}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:560px){.field-row{grid-template-columns:1fr}}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 24px;border-radius:var(--r);font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .btn-primary{background:#1A2E1A;color:#E8F0E8;border-radius:10px}.btn-primary:hover:not(:disabled){background:#2D4A2D}
  .btn-primary:disabled{background:#b0aba3;color:#f5f1eb;cursor:not-allowed}
  .btn-secondary{background:transparent;color:var(--ink);border:1.5px solid var(--border)}.btn-secondary:hover:not(:disabled){border-color:var(--ink)}
  .btn-danger{background:var(--pass-bg);color:var(--pass);border:1px solid #e0c0c0}
  .btn-sm{padding:8px 16px;font-size:13px;min-height:36px}
  .btn-actions{display:flex;gap:10px;margin-top:24px;align-items:center;flex-wrap:wrap}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--cream);border:1px solid var(--border);border-radius:20px;font-size:13px;font-weight:500}
  .tag-remove{cursor:pointer;color:var(--muted);background:none;border:none;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:16px;padding:0;transition:color .15s,background .15s}
  .tag-remove:hover{color:var(--accent);background:var(--pass-bg)}
  .tag-remove:focus-visible{outline:none;box-shadow:var(--focus)}
  .tabs{display:flex;margin-bottom:24px;border-bottom:1px solid var(--border)}
  .tab-btn{padding:10px 20px;min-height:44px;font-size:14px;font-family:inherit;font-weight:500;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;color:var(--muted);transition:all .15s;margin-bottom:-1px}
  .tab-btn[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--ink)}
  .tab-btn:focus-visible{outline:none;box-shadow:inset 0 0 0 2px #4a90e2}
  .score-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-family:var(--font-data);font-weight:500;font-size:14px}
  .score-high{background:#E0F0E0;color:#3A5A3A}.score-mid{background:#F8F4D8;color:#8A6A10}.score-low{background:#F8ECEC;color:#C05050}
  .recommendation-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:var(--r);font-family:var(--font-data);font-size:11px;font-weight:500;text-transform:uppercase;border:1.5px solid currentColor;letter-spacing:0.14em;white-space:normal;word-break:break-word;max-width:100%}
  .rec-pursue{color:var(--success);background:#c8edda}.rec-pass{color:var(--pass);background:var(--pass-bg)}.rec-monitor{color:var(--warn);background:var(--warn-bg)}
.opp-card{background:#fff;border:1px solid #D8E8D8;border-radius:10px;padding:20px 24px;margin-bottom:12px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;max-width:100%;box-sizing:border-box;text-align:${dir === "rtl" ? "right" : "left"};font-family:inherit}
  .opp-card:hover{border-color:var(--ink)}
  .opp-card:focus-visible{outline:none;box-shadow:var(--focus)}
.opp-card-left{flex:1;min-width:0;overflow:hidden}
  .opp-title{font-family:var(--font-prose);font-size:17px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opp-company{font-size:12px;color:var(--muted);font-family:var(--font-data)}
  .section-label{font-family:var(--font-data);font-size:10px;letter-spacing:0.10em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:12px}
  .section-label::after{content:'';flex:1;height:1px;background:var(--border)}
  .filter-row{padding:16px 0;border-bottom:1px solid var(--cream)}.filter-row:last-child{border-bottom:none}
  .filter-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:12px}
  .filter-name{font-family:var(--font-data);font-size:10px;font-weight:400;letter-spacing:0.06em;flex:1}
  .filter-score-dots{display:flex;gap:4px}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--border)}.dot.filled{background:var(--accent)}.dot.gold{background:var(--gold)}
  .filter-rationale{font-family:var(--font-prose);font-size:13px;color:var(--muted);line-height:1.7}
  .filter-score-num{font-family:var(--font-data);font-size:13px;font-weight:600;min-width:28px;text-align:${dir === "rtl" ? "left" : "right"}}
  .score-bar-wrap{background:var(--cream);border-radius:2px;height:5px;margin:4px 0 8px;overflow:hidden;direction:ltr}
  .score-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
  .narrative-box{background:var(--cream);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--accent);padding:16px 20px;border-radius:0 var(--r) var(--r) 0;font-size:14px;line-height:1.7;margin-bottom:16px}
  .narrative-box strong{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .fit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  @media(max-width:560px){.fit-grid{grid-template-columns:1fr}}
  @media(max-width:420px){.app{padding:24px 12px 80px}.opp-card{padding:14px 16px}.score-badge{padding:4px 10px;font-size:12px}}
  .fit-box{padding:14px 16px;border-radius:var(--r);font-size:13px;line-height:1.7}
  .fit-box strong{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;font-weight:700}
  .fit-box ul{padding-${dir === "rtl" ? "right" : "left"}:16px}.fit-box li{margin-bottom:4px}
  .fit-strength{background:#c8edda;color:#0c3322}.fit-gap{background:var(--pass-bg);color:#3d0f0f}
  .loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px}
  .spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:#3A7A3A;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .skeleton-box{border-radius:6px;background:linear-gradient(90deg,var(--border) 25%,#e8e8e8 50%,var(--border) 75%);background-size:300% 100%;animation:shimmer 1.5s infinite}
  @keyframes shimmer{0%{background-position:150% 0}100%{background-position:-150% 0}}
  .loading-text{font-family:var(--font-data);font-size:12px;color:var(--muted);letter-spacing:.1em}
  .scoring-progress{width:100%;max-width:400px;display:flex;flex-direction:column;gap:20px}
  .scoring-progress-bar-track{width:100%;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
  .scoring-progress-bar-fill{height:100%;background:#3A7A3A;border-radius:2px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1)}
  .scoring-progress-steps{display:flex;flex-direction:column;gap:10px}
  .scoring-progress-step{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--muted);transition:color 0.3s}
  .scoring-progress-step.active{color:var(--ink);font-weight:500}
  .scoring-progress-step.done{color:var(--accent)}
  .scoring-step-dot{width:8px;height:8px;border-radius:50%;background:var(--border);flex-shrink:0;transition:background 0.3s}
  .scoring-progress-step.active .scoring-step-dot{background:var(--ink);animation:pulse-dot 1.2s ease-in-out infinite}
  .scoring-progress-step.done .scoring-step-dot{background:var(--accent)}
  @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.7}}
  .alert{padding:12px 16px;border-radius:var(--r);font-size:13px;margin-bottom:16px;line-height:1.6}
  .alert-warn{background:var(--warn-bg);color:var(--warn);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--gold)}
  .alert-error{background:var(--pass-bg);color:var(--pass);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--accent)}
  .custom-filter-row{display:flex;gap:10px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--cream)}.custom-filter-row:last-child{border-bottom:none}
  .weight-select{width:110px;flex-shrink:0;min-height:44px}
  .filter-delete-btn{flex-shrink:0;background:none;border:1.5px solid var(--border);color:var(--muted);cursor:pointer;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:var(--r);font-size:18px;transition:color .15s,border-color .15s}
  .filter-delete-btn:hover{color:var(--accent);border-color:var(--accent)}
  .filter-delete-btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .region-gate{max-width:480px;margin:80px auto}
  .country-option{display:flex;align-items:center;gap:10px;padding:12px 16px;min-height:52px;border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:8px;cursor:pointer;transition:all .15s;background:#fff;width:100%;font-family:inherit;font-size:14px;text-align:${dir === "rtl" ? "right" : "left"}}
  .country-option:hover{border-color:var(--ink)}.country-option:focus-visible{outline:none;box-shadow:var(--focus)}
  .country-option[aria-pressed="true"]{border-color:var(--ink);border-width:2px;background:var(--cream);font-weight:600}
  .back-link{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 0;margin-bottom:24px;font-family:inherit;transition:color .15s;min-height:44px}
  .back-link:hover{color:var(--ink)}.back-link:focus-visible{outline:none;box-shadow:var(--focus);border-radius:var(--r)}
.overall-score-display{display:flex;align-items:center;gap:20px;padding:20px 0;margin-bottom:8px;flex-wrap:wrap;box-sizing:border-box;width:100%}  .big-score{font-family:var(--font-data);font-size:48px;font-weight:500;line-height:1}
  .big-score.high{color:var(--success)}.big-score.mid{color:var(--gold)}.big-score.low{color:var(--accent)}
  .score-meta{flex:1}
.score-meta{flex:1;min-width:0;overflow:hidden}
  .threshold-note{font-size:12px;color:var(--muted);margin-top:4px}
  .url-note{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.6}
  .threshold-label{font-family:var(--font-data);font-size:11px;color:var(--accent);letter-spacing:.1em;text-align:${dir === "rtl" ? "left" : "right"};margin-bottom:4px}
  .empty-state{text-align:center;padding:48px 20px;color:var(--muted)}
  .empty-state-icon{font-size:40px;margin-bottom:12px}
  .empty-state p{font-size:14px;line-height:1.6;max-width:340px;margin:0 auto}
`;
