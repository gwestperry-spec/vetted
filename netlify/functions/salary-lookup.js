const https = require("https");
const crypto = require("crypto");

// ─── salary-lookup ────────────────────────────────────────────────────────────
// Returns compensation range for a given job title.
// Strategy:
//   1. Match against Robert Half 2025 static table (executive/professional roles)
//   2. Fall back to O*NET Web Services for all other titles
//   3. Return { min, max, median, source, occupationTitle }

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

// ─── Robert Half 2025 Static Table ───────────────────────────────────────────
// Source: Robert Half 2025 Salary Guide (midpoint × 0.85 / × 1.15 for range)
// All figures are USD annual base salary (thousands). Adjust with local index.
const RH_TABLE = [
  // ── Finance & Accounting ──
  { keywords: ["chief financial officer", "cfo"],                          title: "Chief Financial Officer (CFO)",         min: 215000, median: 295000, max: 390000 },
  { keywords: ["vp finance", "vice president finance", "vp of finance"],   title: "VP of Finance",                         min: 170000, median: 225000, max: 295000 },
  { keywords: ["controller", "corporate controller"],                       title: "Corporate Controller",                  min: 130000, median: 175000, max: 225000 },
  { keywords: ["director of finance", "finance director"],                  title: "Director of Finance",                   min: 120000, median: 160000, max: 210000 },
  { keywords: ["finance manager", "manager of finance"],                    title: "Finance Manager",                       min:  95000, median: 125000, max: 160000 },
  { keywords: ["senior financial analyst", "sr financial analyst"],         title: "Senior Financial Analyst",              min:  85000, median: 110000, max: 140000 },
  { keywords: ["financial analyst"],                                         title: "Financial Analyst",                     min:  65000, median:  85000, max: 110000 },
  { keywords: ["chief accounting officer", "cao"],                          title: "Chief Accounting Officer",              min: 180000, median: 240000, max: 310000 },
  { keywords: ["director of accounting", "accounting director"],            title: "Director of Accounting",               min: 110000, median: 148000, max: 190000 },
  { keywords: ["treasurer"],                                                 title: "Treasurer",                             min: 140000, median: 190000, max: 250000 },
  { keywords: ["fp&a director", "director of fp&a", "director of fpa"],     title: "Director of FP&A",                      min: 130000, median: 175000, max: 225000 },
  { keywords: ["fp&a manager", "fpa manager"],                              title: "FP&A Manager",                          min:  95000, median: 128000, max: 165000 },
  { keywords: ["internal audit director", "director of internal audit"],    title: "Director of Internal Audit",            min: 120000, median: 162000, max: 210000 },

  // ── Technology ──
  { keywords: ["chief technology officer", "cto"],                          title: "Chief Technology Officer (CTO)",        min: 210000, median: 290000, max: 385000 },
  { keywords: ["chief information officer", "cio"],                         title: "Chief Information Officer (CIO)",       min: 200000, median: 278000, max: 370000 },
  { keywords: ["chief product officer", "cpo"],                             title: "Chief Product Officer (CPO)",           min: 195000, median: 270000, max: 355000 },
  { keywords: ["vp engineering", "vp of engineering", "vice president engineering"], title: "VP of Engineering",            min: 185000, median: 250000, max: 330000 },
  { keywords: ["vp product", "vp of product", "vice president product"],   title: "VP of Product",                         min: 180000, median: 240000, max: 315000 },
  { keywords: ["director of engineering", "engineering director"],          title: "Director of Engineering",               min: 155000, median: 210000, max: 275000 },
  { keywords: ["director of product", "product director"],                  title: "Director of Product Management",        min: 150000, median: 200000, max: 265000 },
  { keywords: ["engineering manager", "software engineering manager"],      title: "Engineering Manager",                   min: 140000, median: 185000, max: 245000 },
  { keywords: ["product manager", "senior product manager"],                title: "Senior Product Manager",                min: 120000, median: 160000, max: 210000 },
  { keywords: ["software architect", "principal engineer", "staff engineer"], title: "Principal / Staff Software Engineer", min: 160000, median: 215000, max: 280000 },
  { keywords: ["senior software engineer", "sr software engineer"],         title: "Senior Software Engineer",              min: 130000, median: 170000, max: 220000 },
  { keywords: ["software engineer", "software developer"],                  title: "Software Engineer",                     min:  95000, median: 130000, max: 170000 },
  { keywords: ["data scientist", "senior data scientist"],                  title: "Data Scientist (Senior)",               min: 120000, median: 160000, max: 210000 },
  { keywords: ["machine learning engineer", "ml engineer", "ai engineer"], title: "Machine Learning Engineer",             min: 145000, median: 195000, max: 255000 },
  { keywords: ["devops engineer", "site reliability engineer", "sre"],     title: "DevOps / SRE Engineer",                 min: 115000, median: 155000, max: 200000 },
  { keywords: ["cybersecurity director", "director of cybersecurity", "ciso", "chief information security officer"], title: "CISO / Cybersecurity Director", min: 175000, median: 235000, max: 310000 },

  // ── Marketing ──
  { keywords: ["chief marketing officer", "cmo"],                           title: "Chief Marketing Officer (CMO)",         min: 195000, median: 270000, max: 360000 },
  { keywords: ["vp marketing", "vp of marketing", "vice president marketing"], title: "VP of Marketing",                   min: 160000, median: 215000, max: 285000 },
  { keywords: ["director of marketing", "marketing director"],              title: "Director of Marketing",                 min: 115000, median: 155000, max: 205000 },
  { keywords: ["director of demand generation", "demand generation director"], title: "Director of Demand Generation",      min: 120000, median: 162000, max: 210000 },
  { keywords: ["vp brand", "vp of brand", "brand director"],               title: "VP / Director of Brand",                min: 130000, median: 175000, max: 230000 },
  { keywords: ["director of content", "content director", "vp content"],   title: "Director of Content",                   min: 100000, median: 135000, max: 175000 },
  { keywords: ["marketing manager", "senior marketing manager"],            title: "Senior Marketing Manager",              min:  85000, median: 115000, max: 150000 },

  // ── Human Resources ──
  { keywords: ["chief human resources officer", "chro", "chief people officer", "cpo people"], title: "CHRO / Chief People Officer", min: 185000, median: 255000, max: 340000 },
  { keywords: ["vp human resources", "vp of hr", "vp people", "vice president hr"], title: "VP of Human Resources",         min: 155000, median: 210000, max: 278000 },
  { keywords: ["director of human resources", "hr director"],               title: "Director of Human Resources",           min: 110000, median: 150000, max: 195000 },
  { keywords: ["director of talent acquisition", "head of talent", "vp talent acquisition"], title: "Director of Talent Acquisition", min: 115000, median: 155000, max: 205000 },
  { keywords: ["director of total rewards", "total rewards director", "head of total rewards"], title: "Director of Total Rewards", min: 120000, median: 162000, max: 212000 },
  { keywords: ["hr business partner", "senior hr business partner", "hrbp"], title: "Senior HR Business Partner",           min:  90000, median: 120000, max: 155000 },

  // ── Operations & Supply Chain ──
  { keywords: ["chief operating officer", "coo"],                           title: "Chief Operating Officer (COO)",         min: 215000, median: 298000, max: 395000 },
  { keywords: ["vp operations", "vp of operations", "vice president operations"], title: "VP of Operations",                min: 165000, median: 222000, max: 295000 },
  { keywords: ["director of operations", "operations director"],            title: "Director of Operations",                min: 115000, median: 158000, max: 210000 },
  { keywords: ["vp supply chain", "vp of supply chain", "vice president supply chain"], title: "VP of Supply Chain",        min: 160000, median: 215000, max: 285000 },
  { keywords: ["director of supply chain", "supply chain director"],        title: "Director of Supply Chain",              min: 115000, median: 155000, max: 205000 },
  { keywords: ["director of logistics", "logistics director", "vp logistics"], title: "Director of Logistics",              min: 105000, median: 142000, max: 188000 },
  { keywords: ["vp procurement", "director of procurement", "procurement director"], title: "Director of Procurement",      min: 118000, median: 158000, max: 210000 },
  { keywords: ["operations manager", "senior operations manager"],          title: "Senior Operations Manager",             min:  85000, median: 115000, max: 150000 },

  // ── Sales ──
  { keywords: ["chief revenue officer", "cro"],                             title: "Chief Revenue Officer (CRO)",           min: 200000, median: 278000, max: 370000 },
  { keywords: ["vp sales", "vp of sales", "vice president sales"],         title: "VP of Sales",                           min: 175000, median: 238000, max: 315000 },
  { keywords: ["director of sales", "sales director"],                     title: "Director of Sales",                     min: 120000, median: 165000, max: 220000 },
  { keywords: ["regional sales manager", "area sales manager"],             title: "Regional Sales Manager",                min:  90000, median: 125000, max: 165000 },
  { keywords: ["enterprise account executive", "senior account executive"], title: "Enterprise Account Executive",          min: 100000, median: 145000, max: 200000 },
  { keywords: ["vp business development", "vp of business development"],   title: "VP of Business Development",            min: 165000, median: 225000, max: 300000 },
  { keywords: ["director of business development", "bd director"],         title: "Director of Business Development",      min: 118000, median: 158000, max: 210000 },

  // ── Legal & Compliance ──
  { keywords: ["general counsel", "chief legal officer", "clo"],            title: "General Counsel / CLO",                 min: 210000, median: 295000, max: 395000 },
  { keywords: ["deputy general counsel", "associate general counsel"],      title: "Associate General Counsel",             min: 165000, median: 225000, max: 295000 },
  { keywords: ["chief compliance officer", "cco", "vp compliance"],        title: "Chief Compliance Officer (CCO)",        min: 175000, median: 240000, max: 315000 },
  { keywords: ["director of compliance", "compliance director"],            title: "Director of Compliance",                min: 115000, median: 158000, max: 210000 },
  { keywords: ["corporate counsel", "in-house counsel"],                    title: "Corporate Counsel",                     min: 120000, median: 165000, max: 220000 },

  // ── Strategy & Corporate Development ──
  { keywords: ["chief strategy officer", "cso strategy"],                   title: "Chief Strategy Officer",                min: 195000, median: 268000, max: 358000 },
  { keywords: ["vp strategy", "vp of strategy", "vice president strategy"], title: "VP of Strategy",                        min: 170000, median: 230000, max: 305000 },
  { keywords: ["director of strategy", "strategy director"],                title: "Director of Strategy",                  min: 130000, median: 175000, max: 232000 },
  { keywords: ["vp corporate development", "director of corporate development", "corp dev"], title: "VP / Director of Corporate Development", min: 165000, median: 225000, max: 298000 },
  { keywords: ["director of mergers", "m&a director", "m&a"],              title: "Director of M&A",                       min: 160000, median: 218000, max: 290000 },

  // ── General Executive ──
  { keywords: ["chief executive officer", "ceo", "president"],              title: "CEO / President",                       min: 250000, median: 375000, max: 600000 },
  { keywords: ["managing director", "md"],                                   title: "Managing Director",                     min: 185000, median: 255000, max: 340000 },
  { keywords: ["general manager", "gm"],                                     title: "General Manager",                       min: 120000, median: 168000, max: 225000 },
];

function matchRobertHalf(title) {
  const lower = (title || "").toLowerCase().trim();
  // Exact / substring keyword match — use longest keyword match wins
  let best = null;
  let bestLen = 0;
  for (const row of RH_TABLE) {
    for (const kw of row.keywords) {
      if (lower.includes(kw) && kw.length > bestLen) {
        best = row;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

// ─── O*NET Helper ─────────────────────────────────────────────────────────────
function onetRequest(path, username, password) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const options = {
      hostname: "services.onetcenter.org",
      path,
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(7000, () => { req.destroy(); reject(new Error("O*NET timeout")); });
    req.end();
  });
}

async function lookupOnet(title, username, password) {
  // Step 1: keyword search
  const encoded = encodeURIComponent(title);
  const searchRes = await onetRequest(
    `/ws/mnm/search?keyword=${encoded}&end=1`,
    username, password
  );
  if (searchRes.status !== 200) return null;

  let searchData;
  try { searchData = JSON.parse(searchRes.body); }
  catch { return null; }

  const occupations = searchData?.occupation;
  if (!Array.isArray(occupations) || occupations.length === 0) return null;

  const occ = occupations[0];
  const code = occ.code;
  const occTitle = occ.title;

  // Step 2: wage lookup
  const wageRes = await onetRequest(
    `/ws/online/occupations/${code}/summary/wages/national`,
    username, password
  );
  if (wageRes.status !== 200) return null;

  let wageData;
  try { wageData = JSON.parse(wageRes.body); }
  catch { return null; }

  // O*NET returns annual_10, annual_25, annual_median, annual_75, annual_90
  const wages = wageData?.wages;
  if (!wages) return null;

  const median = wages.annual_median;
  const p25    = wages.annual_25;
  const p75    = wages.annual_75;

  if (!median) return null;

  return {
    min:    Math.round((p25  || median * 0.82) / 1000) * 1000,
    median: Math.round(median / 1000) * 1000,
    max:    Math.round((p75  || median * 1.18) / 1000) * 1000,
    source: "O*NET",
    occupationTitle: occTitle,
    occupationCode: code, // pass to BLS for geographic lookup
  };
}

// ─── State abbreviation → FIPS code ──────────────────────────────────────────
const STATE_FIPS = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",
  FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",
  KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",
  MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",NY:"36",
  NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",SC:"45",
  SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",
  WI:"55",WY:"56",DC:"11",
};

// Extract 2-letter state abbreviation from a location string like "Dallas, TX"
function extractStateFips(location) {
  if (!location) return null;
  const match = location.match(/\b([A-Z]{2})\b/);
  if (match && STATE_FIPS[match[1]]) return STATE_FIPS[match[1]];
  // Try full state name match
  const lower = location.toLowerCase();
  const nameMap = {
    "alabama":"01","alaska":"02","arizona":"04","arkansas":"05","california":"06",
    "colorado":"08","connecticut":"09","delaware":"10","florida":"12","georgia":"13",
    "hawaii":"15","idaho":"16","illinois":"17","indiana":"18","iowa":"19","kansas":"20",
    "kentucky":"21","louisiana":"22","maine":"23","maryland":"24","massachusetts":"25",
    "michigan":"26","minnesota":"27","mississippi":"28","missouri":"29","montana":"30",
    "nebraska":"31","nevada":"32","new hampshire":"33","new jersey":"34","new mexico":"35",
    "new york":"36","north carolina":"37","north dakota":"38","ohio":"39","oklahoma":"40",
    "oregon":"41","pennsylvania":"42","rhode island":"44","south carolina":"45",
    "south dakota":"46","tennessee":"47","texas":"48","utah":"49","vermont":"50",
    "virginia":"51","washington":"53","west virginia":"54","wisconsin":"55","wyoming":"56",
  };
  for (const [name, fips] of Object.entries(nameMap)) {
    if (lower.includes(name)) return fips;
  }
  return null;
}

// Convert O*NET SOC code ("15-1252.00") to BLS 6-digit occupation code ("151252")
function socToBls(socCode) {
  return (socCode || "").replace(/[-\.]/g, "").substring(0, 6);
}

// ─── BLS OES Helper ────────────────────────────────────────────────────────────
// Queries Bureau of Labor Statistics Occupational Employment & Wage Statistics.
// Returns state-level wages when location is provided, national otherwise.
// Series ID format: OEUS{2-digit-fips}0000000{6-digit-SOC}03 (state annual mean)
//                   OEUN0000000000000{6-digit-SOC}03         (national annual mean)
async function lookupBLS(socCode, stateFips) {
  const occ = socToBls(socCode);
  if (!occ || occ.length < 6) return null;

  const seriesId = stateFips
    ? `OEUS${stateFips}0000000${occ}03`
    : `OEUN0000000000000${occ}03`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      seriesid: [seriesId],
      startyear: "2023",
      endyear: "2024",
    });

    const options = {
      hostname: "api.bls.gov",
      path: "/publicAPI/v2/timeseries/data/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const series = json?.Results?.series?.[0];
          const dataPoints = series?.data;
          if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
            resolve(null); return;
          }
          // Most recent year, annual period
          const annual = dataPoints.find(d => d.period === "A01") || dataPoints[0];
          const mean = parseInt((annual?.value || "").replace(/,/g, ""), 10);
          if (!mean || isNaN(mean)) { resolve(null); return; }

          resolve({
            min:    Math.round(mean * 0.80 / 1000) * 1000,
            median: Math.round(mean / 1000) * 1000,
            max:    Math.round(mean * 1.22 / 1000) * 1000,
            source: stateFips ? "BLS OES (State)" : "BLS OES (National)",
            occupationTitle: socCode,
            geographic: !!stateFips,
          });
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── Auth: shared-secret header check removed (was exposed in client bundle).
  // Per-user session token validation (HMAC of appleId) below is the auth layer.
  const serverSecret = process.env.VETTED_SECRET || "";

  // ── Parse body ──────────────────────────────────────────────────────────────
  let parsed;
  try { parsed = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { title, appleId, sessionToken, location } = parsed;

  if (!appleId || !sessionToken || !title) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // ── Session token verification ───────────────────────────────────────────────
  if (serverSecret) {
    const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
    if (!crypto.timingSafeEqual(
      Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64)),
      Buffer.from(expected.padEnd(64, "0").slice(0, 64))
    )) {
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Robert Half lookup (fast, no network) ────────────────────────────────────
  console.log(`[salary-lookup] title="${title}" location="${location || ""}"`);
  const rhMatch = matchRobertHalf(title);
  console.log(`[salary-lookup] RH match: ${rhMatch ? rhMatch.title : "none"}`);
  if (rhMatch) {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        min:    rhMatch.min,
        median: rhMatch.median,
        max:    rhMatch.max,
        source: "Robert Half 2025",
        occupationTitle: rhMatch.title,
      }),
    };
  }

  // ── O*NET + BLS parallel lookup ──────────────────────────────────────────────
  const onetUsername = process.env.ONET_USERNAME || "";
  const onetPassword = process.env.ONET_PASSWORD || "";

  if (!onetUsername || !onetPassword) {
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ error: "No salary data available" }) };
  }

  try {
    // Run O*NET first — this is the primary data source
    const onetResult = await lookupOnet(title, onetUsername, onetPassword);
    if (!onetResult) {
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ error: "No salary data found" }) };
    }

    // ── BLS OES geographic enhancement ────────────────────────────────────────
    // Run in parallel with a hard 5s timeout so it never blocks the response.
    const stateFips = extractStateFips(location);
    let blsResult = null;

    if (onetResult.occupationCode && stateFips) {
      const blsTimeout = new Promise(resolve => setTimeout(() => resolve(null), 5000));
      blsResult = await Promise.race([
        lookupBLS(onetResult.occupationCode, stateFips).catch(() => null),
        blsTimeout,
      ]);
    }

    // Strip internal occupationCode from response (not needed client-side)
    const { occupationCode: _code, ...onetOut } = onetResult;

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        ...onetOut,
        ...(blsResult ? {
          geo: {
            min:    blsResult.min,
            median: blsResult.median,
            max:    blsResult.max,
            source: blsResult.source,
            location: location || null,
          }
        } : {}),
      }),
    };
  } catch (err) {
    console.error("Salary lookup error:", err.message);
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ error: "Salary lookup unavailable" }) };
  }
};
