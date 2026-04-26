const https = require("https");
const crypto = require("crypto");
const { sanitizeTitle } = require("./sanitizeTitle");

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
  { keywords: ["vp it", "vp of it", "vice president it", "vp information technology", "vp of information technology", "vice president information technology", "vp of technology", "vp technology", "vice president technology"], title: "VP of IT / Technology",                min: 165000, median: 222000, max: 292000 },
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
  // NOTE: VP/Director-level operations, supply chain, procurement, and logistics
  // roles are intentionally deferred to the Kinsa table (Tier 2) which has
  // food-industry-specific data from 6,000+ candidate interviews. Only the
  // C-suite COO is kept here for generic cross-industry searches.
  { keywords: ["chief operating officer", "coo"],                           title: "Chief Operating Officer (COO)",         min: 215000, median: 298000, max: 395000 },

  // ── Sales ──
  // NOTE: VP Sales, Director of Sales, Regional Sales Manager deferred to Kinsa (food industry).
  // CRO, enterprise AE, and BD director kept here for cross-industry / SaaS / tech contexts.
  { keywords: ["chief revenue officer", "cro"],                             title: "Chief Revenue Officer (CRO)",           min: 200000, median: 278000, max: 370000 },
  { keywords: ["enterprise account executive", "senior account executive"], title: "Enterprise Account Executive",          min: 100000, median: 145000, max: 200000 },
  { keywords: ["vp business development", "vp of business development"],   title: "VP of Business Development",            min: 165000, median: 225000, max: 300000 },
  { keywords: ["director of business development", "bd director"],         title: "Director of Business Development",      min: 118000, median: 158000, max: 210000 },

  // ── Legal & Compliance ──
  { keywords: ["general counsel", "chief legal officer", "clo"],            title: "General Counsel / CLO",                 min: 210000, median: 295000, max: 395000 },
  { keywords: ["deputy general counsel", "associate general counsel"],      title: "Associate General Counsel",             min: 165000, median: 225000, max: 295000 },
  { keywords: ["chief compliance officer", "cco", "vp compliance"],        title: "Chief Compliance Officer (CCO)",        min: 175000, median: 240000, max: 315000 },
  { keywords: ["director of compliance", "compliance director"],            title: "Director of Compliance",                min: 115000, median: 158000, max: 210000 },
  { keywords: ["corporate counsel", "in-house counsel"],                    title: "Corporate Counsel",                     min: 120000, median: 165000, max: 220000 },

  // ── Investment Banking / Private Equity / Asset Management ──
  { keywords: ["managing director investment banking", "managing director ib", "md investment banking", "md ib"], title: "Managing Director, Investment Banking", min: 300000, median: 420000, max: 650000 },
  { keywords: ["principal private equity", "principal pe", "pe principal", "principal growth equity", "principal venture"], title: "Principal, Private Equity / Growth Equity", min: 225000, median: 335000, max: 480000 },
  { keywords: ["principal investment banking", "principal ib", "principal advisory", "principal m&a"], title: "Principal, Investment Banking",            min: 200000, median: 300000, max: 425000 },
  { keywords: ["principal consulting", "principal management consulting", "principal strategy consulting"], title: "Principal, Management Consulting",       min: 175000, median: 260000, max: 365000 },
  { keywords: ["principal", "senior principal"],                                                title: "Principal (Finance / Consulting)",            min: 175000, median: 270000, max: 390000 },
  { keywords: ["senior portfolio manager", "sr portfolio manager"],                            title: "Senior Portfolio Manager",                   min: 155000, median: 245000, max: 420000 },
  { keywords: ["portfolio manager"],                                                            title: "Portfolio Manager",                          min: 120000, median: 190000, max: 310000 },
  { keywords: ["investment manager", "fund manager", "senior investment manager"],             title: "Investment Manager",                         min: 120000, median: 190000, max: 295000 },
  { keywords: ["vice president investment banking", "vp investment banking", "vp ib", "vice president ib"], title: "VP, Investment Banking",             min: 175000, median: 260000, max: 380000 },
  { keywords: ["director investment banking", "director ib", "director of investment banking"], title: "Director, Investment Banking",               min: 200000, median: 295000, max: 420000 },
  { keywords: ["investment analyst", "senior investment analyst"],                             title: "Senior Investment Analyst",                  min: 100000, median: 145000, max: 210000 },

  // ── Strategy & Corporate Development ──
  { keywords: ["chief strategy officer", "cso strategy"],                   title: "Chief Strategy Officer",                min: 195000, median: 268000, max: 358000 },
  { keywords: ["vp strategy", "vp of strategy", "vice president strategy"], title: "VP of Strategy",                        min: 170000, median: 230000, max: 305000 },
  { keywords: ["director of strategy", "strategy director", "director of enablement", "enablement director", "business model director", "director of business model", "director business model", "director of transformation", "transformation director", "director of growth", "growth director"], title: "Director of Strategy",                  min: 130000, median: 175000, max: 232000 },
  { keywords: ["vp corporate development", "director of corporate development", "corp dev"], title: "VP / Director of Corporate Development", min: 165000, median: 225000, max: 298000 },
  { keywords: ["director of mergers", "m&a director", "m&a"],              title: "Director of M&A",                       min: 160000, median: 218000, max: 290000 },

  // ── General Executive ──
  // "president" removed — word-boundary matches inside "vice president" / "senior vice president"
  { keywords: ["senior vice president", "executive vice president", "evp", "svp"], title: "Senior Vice President / EVP", min: 200000, median: 310000, max: 500000 },
  { keywords: ["chief executive officer", "ceo"],                           title: "CEO / President",                       min: 250000, median: 375000, max: 600000 },
  { keywords: ["managing director", "md"],                                   title: "Managing Director",                     min: 185000, median: 255000, max: 340000 },
  { keywords: ["general manager", "gm"],                                     title: "General Manager",                       min: 120000, median: 168000, max: 225000 },
];

// ─── Kinsa Food & Beverage Salary Table ──────────────────────────────────────
// Source: Kinsa Group 2026 Food & Beverage Salary Guide
// Data from 6,000+ candidate interviews across the US food & beverage industry.
// Covers CPG, food manufacturing, food service, and food retail.
// All figures are USD annual base salary (national median).
// COL adjustments available per Kinsa guide (city/state multipliers on page 9).
const KINSA_TABLE = [

  // ── Food Science / Product Development ──
  { keywords: ["chief science officer", "sr vp r&d", "svp r&d"],                          title: "Chief Science Officer / Sr VP R&D",         min: 175000, median: 220000, max: 350000 },
  { keywords: ["vp r&d and innovation", "vp of r&d and innovation", "vice president r&d and innovation", "vp of r&d", "vp r&d", "vice president r&d", "vice president research and development"], title: "VP of R&D & Innovation", min: 130000, median: 200000, max: 280000 },
  { keywords: ["director of r&d", "r&d director", "director research and development", "director of research and development"], title: "Director of R&D", min: 100000, median: 170000, max: 260000 },
  { keywords: ["principal scientist", "principal food scientist", "lead scientist"],        title: "Principal Scientist",                       min: 130000, median: 170000, max: 250000 },
  { keywords: ["r&d manager", "research and development manager", "r and d manager", "research & development manager"], title: "R&D Manager",    min:  80000, median: 135000, max: 180000 },
  { keywords: ["r&d project manager", "research and development project manager"],          title: "R&D Project Manager",                       min:  80000, median: 130000, max: 165000 },
  { keywords: ["senior food scientist", "sr food scientist", "sr. food scientist"],         title: "Senior Food Scientist",                     min: 100000, median: 130000, max: 160000 },
  { keywords: ["food scientist"],                                                            title: "Food Scientist",                            min:  70000, median: 100000, max: 150000 },
  { keywords: ["food technologist"],                                                         title: "Food Technologist",                         min:  70000, median:  90000, max: 130000 },
  { keywords: ["r&d coordinator", "r&d specialist", "research and development coordinator", "research and development specialist"], title: "R&D Coordinator / Specialist", min: 60000, median: 90000, max: 120000 },
  { keywords: ["product development lab technician", "lab technician food", "food lab technician"], title: "Product Development Lab Technician", min: 50000, median: 70000, max: 110000 },
  { keywords: ["r&d intern", "research assistant food", "food research intern"],             title: "R&D Intern / Research Assistant",           min:  50000, median:  70000, max:  90000 },

  // ── Quality / Food Safety / Regulatory ──
  { keywords: ["vp of quality", "vp quality", "vp food safety", "vp of food safety", "vice president quality", "vice president food safety"], title: "VP of Quality / Food Safety", min: 160000, median: 200000, max: 300000 },
  { keywords: ["director food safety and quality", "director of food safety and quality", "director of quality and food safety", "fsq director", "director of fsqa"], title: "Director of Food Safety & Quality", min: 90000, median: 160000, max: 260000 },
  { keywords: ["regulatory manager", "regulatory director", "director of regulatory", "regulatory affairs manager", "regulatory affairs director"], title: "Regulatory Manager / Director", min: 100000, median: 140000, max: 200000 },
  { keywords: ["food safety quality assurance manager", "fsqa manager", "food safety and quality assurance manager", "food safety qa manager", "quality assurance manager", "qa manager", "quality manager", "food safety manager", "manager of food safety"], title: "Food Safety & QA Manager", min: 80000, median: 120000, max: 160000 },
  { keywords: ["quality engineer"],                                                          title: "Quality Engineer",                          min:  80000, median: 115000, max: 160000 },
  { keywords: ["fsqa auditor", "food safety auditor", "quality auditor"],                   title: "FSQA Auditor",                              min:  75000, median:  90000, max: 140000 },
  { keywords: ["quality analyst"],                                                           title: "Quality Analyst",                           min:  50000, median:  90000, max: 125000 },
  { keywords: ["quality assurance supervisor", "qa supervisor", "quality control supervisor", "qc supervisor"], title: "QA / QC Supervisor",  min:  60000, median:  85000, max: 115000 },
  { keywords: ["food safety coordinator", "haccp coordinator", "fsqa coordinator"],         title: "Food Safety Coordinator",                   min:  55000, median:  85000, max: 120000 },
  { keywords: ["quality technician", "qa technician", "qc technician"],                    title: "Quality Technician",                        min:  50000, median:  60000, max:  70000 },
  { keywords: ["regulatory specialist", "regulatory affairs specialist"],                   title: "Regulatory Specialist",                     min:  70000, median: 100000, max: 130000 },
  { keywords: ["quality specialist", "qa specialist"],                                      title: "Quality Specialist",                        min:  70000, median:  95000, max: 140000 },
  { keywords: ["sanitation manager", "director of sanitation", "sanitation director"],      title: "Sanitation Manager",                        min:  80000, median: 100000, max: 145000 },
  { keywords: ["sanitation supervisor"],                                                     title: "Sanitation Supervisor",                     min:  60000, median:  85000, max: 115000 },

  // ── Operations / Production (Food Manufacturing) ──
  { keywords: ["vp of operations", "vice president of operations", "vp operations"],        title: "VP of Operations (Food)",                   min: 150000, median: 240000, max: 300000 },
  // "regional senior director" catches "Regional Senior Director, Operations" —
  // comma after "director" breaks "director of operations" phrase match
  { keywords: ["senior director of operations", "senior director operations", "regional director of operations", "regional senior director", "senior operations director"], title: "Senior Director of Operations", min: 130000, median: 200000, max: 280000 },
  { keywords: ["director of operations", "operations director"],                            title: "Director of Operations (Food)",             min: 100000, median: 180000, max: 260000 },
  { keywords: ["plant manager", "manufacturing plant manager"],                             title: "Plant Manager",                             min: 100000, median: 160000, max: 250000 },
  { keywords: ["continuous improvement manager", "continuous improvement director", "ci manager", "ci director", "lean manager", "lean director", "opex manager"], title: "Continuous Improvement Manager / Director", min: 90000, median: 140000, max: 220000 },
  { keywords: ["brewing manager", "distillery manager", "brewery manager"],                 title: "Brewing / Distillery Manager",              min:  75000, median: 120000, max: 195000 },
  { keywords: ["production manager", "operations manager", "manufacturing manager"],        title: "Production / Operations Manager",           min:  70000, median: 120000, max: 225000 },
  { keywords: ["demand planning manager", "master scheduler", "demand planner"],           title: "Demand Planning Manager / Master Scheduler", min: 70000, median: 125000, max: 170000 },
  { keywords: ["plant superintendent", "production superintendent"],                        title: "Production / Plant Superintendent",         min:  85000, median: 110000, max: 155000 },
  { keywords: ["production supervisor", "manufacturing supervisor"],                        title: "Production Supervisor",                     min:  60000, median:  80000, max: 130000 },

  // ── Supply Chain / Procurement (Food Industry) ──
  { keywords: ["chief supply chain officer", "csco"],                                       title: "Chief Supply Chain Officer",                min: 180000, median: 280000, max: 400000 },
  { keywords: ["vp supply chain", "vice president supply chain", "vp of supply chain", "vp supply chain and purchasing", "vp of purchasing", "vp sourcing", "vp of sourcing", "vice president sourcing", "vp of indirect sourcing", "vp indirect sourcing", "vp of direct sourcing", "vp direct sourcing"], title: "VP Supply Chain & Purchasing", min: 150000, median: 230000, max: 350000 },
  { keywords: ["procurement director", "director of procurement", "director of purchasing", "dairy procurement", "director of dairy procurement", "director of commodity procurement", "commodity procurement"], title: "Procurement Director", min: 110000, median: 180000, max: 225000 },
  { keywords: ["supply chain director", "director of supply chain", "director supply chain"], title: "Supply Chain Director",                   min: 120000, median: 175000, max: 265000 },
  { keywords: ["logistics director", "transportation director", "director of logistics", "director of transportation", "director of distribution", "distribution director", "director distribution", "director of field service", "field service director", "director field service"], title: "Logistics / Transportation Director", min: 120000, median: 170000, max: 225000 },
  { keywords: ["logistics manager", "transportation manager"],                               title: "Logistics / Transportation Manager",        min: 100000, median: 130000, max: 150000 },
  { keywords: ["supply chain manager", "manager of supply chain"],                          title: "Supply Chain Manager",                      min:  80000, median: 130000, max: 180000 },
  { keywords: ["purchasing manager", "sourcing manager", "procurement manager"],            title: "Purchasing / Sourcing Manager",             min:  80000, median: 125000, max: 160000 },
  { keywords: ["warehouse manager", "distribution manager", "warehouse director"],          title: "Warehouse / Distribution Manager",          min:  80000, median: 120000, max: 200000 },
  { keywords: ["buyer", "ingredient buyer", "commodity buyer", "raw material buyer"],       title: "Buyer",                                     min:  70000, median: 105000, max: 150000 },
  { keywords: ["warehouse supervisor"],                                                      title: "Warehouse Supervisor",                      min:  80000, median: 105000, max: 120000 },
  { keywords: ["inventory specialist", "supply chain specialist", "logistics specialist"],  title: "Inventory / Supply Chain Specialist",       min:  80000, median:  90000, max: 120000 },

  // ── Engineering (Food Manufacturing) ──
  { keywords: ["vp of engineering", "vice president engineering", "vp engineering"],        title: "VP of Engineering",                         min: 170000, median: 230000, max: 300000 },
  { keywords: ["director of engineering", "engineering director"],                          title: "Director of Engineering",                   min: 170000, median: 200000, max: 250000 },
  { keywords: ["engineering manager"],                                                       title: "Engineering Manager",                       min: 120000, median: 160000, max: 225000 },
  { keywords: ["engineering project manager"],                                               title: "Engineering Project Manager",               min: 100000, median: 150000, max: 225000 },
  { keywords: ["reliability engineer", "reliability manager"],                               title: "Reliability Engineer / Manager",            min: 110000, median: 150000, max: 225000 },
  { keywords: ["project engineer"],                                                          title: "Project Engineer",                          min:  85000, median: 130000, max: 185000 },
  { keywords: ["plant engineer", "mechanical engineer food", "food plant engineer"],         title: "Plant Engineer / Mechanical Engineer",      min:  90000, median: 130000, max: 175000 },
  { keywords: ["process engineer", "r&d engineer", "food process engineer"],                title: "Process / R&D Engineer",                    min:  80000, median: 120000, max: 170000 },
  { keywords: ["control systems engineer", "automation engineer", "controls engineer"],     title: "Control Systems Engineer",                  min: 100000, median: 135000, max: 160000 },
  { keywords: ["sales engineer"],                                                            title: "Sales Engineer",                            min:  80000, median: 120000, max: 225000 },

  // ── Maintenance ──
  { keywords: ["maintenance manager"],                                                       title: "Maintenance Manager",                       min:  90000, median: 130000, max: 180000 },
  { keywords: ["maintenance supervisor"],                                                    title: "Maintenance Supervisor",                    min:  90000, median: 110000, max: 140000 },
  { keywords: ["maintenance technician"],                                                    title: "Maintenance Technician",                    min:  60000, median: 100000, max: 120000 },

  // ── Environmental Health & Safety ──
  { keywords: ["environmental health and safety manager", "ehs manager", "environmental health safety manager", "esh manager", "health and safety manager"], title: "Environmental Health & Safety Manager", min: 90000, median: 125000, max: 160000 },

  // ── Food Service / Restaurant ──
  { keywords: ["director of culinary", "culinary director"],                                title: "Director of Culinary",                      min:  75000, median: 160000, max: 225000 },
  { keywords: ["director of catering", "catering director", "catering strategy", "director of foodservice", "foodservice director", "food service director", "director of food service", "foodservice operations director", "director of catering and events"], title: "Director of Catering / Foodservice", min: 90000, median: 140000, max: 190000 },
  { keywords: ["culinary innovation", "culinary manager", "senior culinary manager", "culinary commercialization", "commercialization manager", "director of culinary innovation", "culinary development manager", "culinary innovation manager"], title: "Senior Culinary / Innovation Manager", min: 90000, median: 130000, max: 175000 },
  { keywords: ["executive chef"],                                                            title: "Executive Chef",                            min:  80000, median: 120000, max: 180000 },
  { keywords: ["sous chef"],                                                                 title: "Sous Chef",                                 min:  60000, median:  75000, max:  80000 },
  { keywords: ["restaurant manager"],                                                        title: "Restaurant Manager",                        min:  50000, median:  90000, max: 150000 },
  { keywords: ["food and beverage manager", "food & beverage manager", "f&b manager", "food and beverage director", "food & beverage director"], title: "Food & Beverage Manager / Director", min: 70000, median: 100000, max: 180000 },

  // ── Sales / Business Development (Food Industry) ──
  { keywords: ["vp of sales", "vice president sales", "vp sales"],                          title: "VP of Sales (Food & Beverage)",             min: 120000, median: 200000, max: 280000 },
  { keywords: ["international sales manager", "international sales director"],               title: "International Sales Manager / Director",    min: 100000, median: 160000, max: 275000 },
  { keywords: ["director of sales", "sales director"],                                      title: "Director of Sales (Food & Beverage)",       min:  80000, median: 160000, max: 275000 },
  { keywords: ["national sales manager", "national account manager", "national accounts manager"], title: "National Sales Manager / National Accounts", min: 90000, median: 150000, max: 250000 },
  { keywords: ["category manager"],                                                          title: "Category Manager",                          min:  90000, median: 150000, max: 180000 },
  { keywords: ["industrial sales manager", "b2b sales manager"],                            title: "Industrial / B2B Sales Manager",            min:  80000, median: 140000, max: 180000 },
  { keywords: ["key account manager"],                                                       title: "Key Account Manager",                       min:  80000, median: 130000, max: 215000 },
  { keywords: ["business development manager"],                                              title: "Business Development Manager",              min:  80000, median: 130000, max: 200000 },
  { keywords: ["regional sales manager"],                                                    title: "Regional Sales Manager",                    min:  80000, median: 130000, max: 200000 },
  { keywords: ["sales manager"],                                                             title: "Sales Manager",                             min:  80000, median: 120000, max: 235000 },
  { keywords: ["account manager"],                                                           title: "Account Manager",                           min:  80000, median: 120000, max: 190000 },
  { keywords: ["district sales manager"],                                                    title: "District Sales Manager",                    min:  80000, median: 110000, max: 140000 },
  { keywords: ["account executive"],                                                         title: "Account Executive",                         min:  70000, median: 100000, max: 175000 },
  { keywords: ["territory sales manager", "area sales manager"],                             title: "Area / Territory Sales Manager",            min:  70000, median: 100000, max: 140000 },
  { keywords: ["sales representative"],                                                      title: "Sales Representative",                      min:  50000, median:  80000, max: 140000 },

  // ── Marketing (Food Industry) ──
  { keywords: ["vp of marketing", "vice president marketing", "vp marketing"],               title: "VP of Marketing (Food & Beverage)",         min: 140000, median: 200000, max: 275000 },
  { keywords: ["marketing director", "director of marketing"],                               title: "Marketing Director (Food & Beverage)",      min: 100000, median: 170000, max: 250000 },
  { keywords: ["brand manager", "senior brand manager", "sr brand manager"],                 title: "Brand Manager / Sr Brand Manager",          min:  90000, median: 150000, max: 210000 },
  { keywords: ["product manager"],                                                            title: "Product Manager (Food & Beverage)",         min: 100000, median: 150000, max: 200000 },
  { keywords: ["marketing manager"],                                                          title: "Marketing Manager",                         min:  80000, median: 135000, max: 180000 },
  { keywords: ["digital marketing manager", "ecommerce manager", "e-commerce manager"],      title: "Digital Marketing / E-Commerce Manager",    min:  90000, median: 110000, max: 150000 },
  { keywords: ["marketing specialist", "marketing analyst"],                                  title: "Marketing Specialist / Analyst",            min:  75000, median:  90000, max: 130000 },

  // ── Human Resources (Food Industry) ──
  { keywords: ["chief people officer", "chief human resources officer", "chro"],            title: "Chief People Officer / VP of HR",           min: 150000, median: 235000, max: 350000 },
  { keywords: ["director of human resources", "hr director", "human resources director"],   title: "Director of Human Resources",               min: 100000, median: 160000, max: 240000 },
  { keywords: ["human resources manager", "hr manager"],                                     title: "Human Resources Manager",                   min:  80000, median: 125000, max: 150000 },
  { keywords: ["recruiter", "talent acquisition manager", "talent acquisition specialist"], title: "Recruiter / Talent Acquisition Manager",    min:  70000, median:  90000, max: 125000 },

  // ── Finance / Accounting (Food Industry) ──
  { keywords: ["vice president of finance", "vp of finance", "vp finance"],                 title: "VP of Finance (Food Industry)",             min: 160000, median: 225000, max: 285000 },
  { keywords: ["director of finance", "finance director"],                                   title: "Director of Finance (Food Industry)",       min: 150000, median: 180000, max: 225000 },
  { keywords: ["controller"],                                                                 title: "Controller (Food Industry)",                min: 130000, median: 160000, max: 200000 },
  { keywords: ["accounting manager", "finance manager", "manager of accounting"],           title: "Manager, Accounting / Finance",             min: 100000, median: 135000, max: 150000 },
  { keywords: ["financial analyst"],                                                          title: "Financial Analyst",                         min:  90000, median: 110000, max: 150000 },
  { keywords: ["accountant", "senior accountant"],                                           title: "Accountant / Senior Accountant",            min:  80000, median: 100000, max: 120000 },

  // ── C-Suite / Executive (Food Industry specific) ──
  { keywords: ["chief commercial officer", "cco"],                                           title: "Chief Commercial Officer",                  min: 165000, median: 250000, max: 450000 },
  { keywords: ["general manager", "managing director"],                                      title: "General Manager / Managing Director",       min: 120000, median: 200000, max: 450000 },
];

function matchTable(table, title) {
  // Normalize: lowercase, strip commas/punctuation, collapse spaces.
  // "VP, Supply Chain North America" → "vp supply chain north america"
  // This allows keyword "vp supply chain" to match regardless of comma or
  // geographic qualifiers appended to the title.
  const lower = (title || "")
    .toLowerCase()
    .replace(/[,;|]/g, " ")   // commas, semicolons, pipes → space
    .replace(/\s+/g, " ")     // collapse multiple spaces
    .trim();
  let best = null;
  let bestLen = 0;
  for (const row of table) {
    for (const kw of row.keywords) {
      // Word-boundary regex prevents short abbreviations (cto, coo, cfo, cso)
      // from matching as substrings inside longer words like "director" or "coordinator".
      // Escape regex special chars in the keyword before building the pattern.
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`);
      if (pattern.test(lower) && kw.length > bestLen) {
        best = row;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

function matchRobertHalf(title) { return matchTable(RH_TABLE, title); }
function matchKinsa(title)       { return matchTable(KINSA_TABLE, title); }

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

  // ── Sanitize title ──────────────────────────────────────────────────────────
  const sanitized = sanitizeTitle(title);
  if (!sanitized.ok) {
    console.warn("[salary-lookup] sanitizeTitle rejected:", sanitized.reason, String(title).slice(0, 80));
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid title", reason: sanitized.reason }) };
  }
  const safeTitle = sanitized.title;

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

  // ── Tier 1: Robert Half (executive / professional roles) ─────────────────────
  console.log(`[salary-lookup] title="${safeTitle}" location="${location || ""}"`);
  const rhMatch = matchRobertHalf(safeTitle);
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

  // ── Tier 2: Kinsa (food & beverage industry roles) ───────────────────────────
  const kinsaMatch = matchKinsa(safeTitle);
  console.log(`[salary-lookup] Kinsa match: ${kinsaMatch ? kinsaMatch.title : "none"}`);
  if (kinsaMatch) {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        min:    kinsaMatch.min,
        median: kinsaMatch.median,
        max:    kinsaMatch.max,
        source: "Kinsa 2026",
        occupationTitle: kinsaMatch.title,
      }),
    };
  }

  // ── Tier 3: O*NET + BLS parallel lookup ──────────────────────────────────────
  const onetUsername = process.env.ONET_USERNAME || "";
  const onetPassword = process.env.ONET_PASSWORD || "";

  if (!onetUsername || !onetPassword) {
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ error: "No salary data available" }) };
  }

  try {
    // Strip geographic qualifiers before O*NET lookup — they confuse keyword matching
    // e.g. "VP, Supply Chain North America" → "VP Supply Chain"
    const GEO_QUALIFIERS = /\b(north america|south america|latin america|emea|apac|amer|asia pacific|americas|pacific rim|global|international|worldwide|enterprise|north|south|east|west|midwest|northeast|southeast|northwest|southwest|regional|national|domestic|canada|mexico)\b/gi;
    const cleaned = safeTitle.replace(/[,;|]/g, " ").replace(GEO_QUALIFIERS, "").replace(/\s+/g, " ").trim() || safeTitle;

    // Synonym expansion — normalize common title variants to O*NET-friendly equivalents
    // Applied after geo stripping so "Global Sourcing" → "Global Procurement" → "Procurement"
    const SYNONYMS = [
      [/\bsourcing\b/gi, "procurement"],        // VP of Sourcing → VP of Procurement
      [/\bhead of\b/gi,  "director of"],         // Head of X → Director of X (O*NET has no "head of")
      [/\b\bit\b/gi,     "information technology"], // VP of IT → VP of Information Technology
      [/\bprepared foods?\b/gi, "food production"],  // Head of Prepared Foods → Director of Food Production
      [/\bculinary innovation\b/gi, "food science"],  // maps to O*NET food science bucket
    ];
    let onetTitle = cleaned;
    for (const [pattern, replacement] of SYNONYMS) {
      onetTitle = onetTitle.replace(pattern, replacement);
    }
    if (onetTitle !== cleaned) {
      console.log(`[salary-lookup] synonym expansion: "${cleaned}" → "${onetTitle}"`);
    }

    // Run O*NET first — this is the primary data source
    let onetResult = await lookupOnet(onetTitle, onetUsername, onetPassword);

    // ── O*NET retry: condense to "Level + primary function" ───────────────────
    // Handles unusual compound titles like "Director, Business Model Enablement"
    // or "Director, Distribution and Field Service" that O*NET can't match verbatim.
    if (!onetResult) {
      const SENIORITY = /\b(chief|president|executive vice president|senior vice president|evp|svp|vice president|vp|senior director|director|senior manager|manager|senior|lead|principal|staff|head of)\b/gi;
      const seniority = (onetTitle.match(SENIORITY) || [])[0] || "";
      // Strip filler words to isolate core function: "and", "of", "the", "&", plus the seniority token itself
      const STOP_WORDS = /\b(and|of|the|&|for|in|at|with|by)\b/gi;
      const coreWords = onetTitle
        .replace(new RegExp(`\\b${seniority}\\b`, "gi"), "")
        .replace(STOP_WORDS, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 2)   // take up to 2 most significant content words
        .join(" ");
      const condensed = seniority && coreWords ? `${seniority} ${coreWords}`.trim() : onetTitle;
      if (condensed !== onetTitle) {
        console.log(`[salary-lookup] O*NET retry with condensed title: "${condensed}"`);
        onetResult = await lookupOnet(condensed, onetUsername, onetPassword);
      }
    }

    // ── Seniority-based fallback ───────────────────────────────────────────────
    // If O*NET still returns nothing, return a reasonable range based on seniority
    // level so the user always gets a useful data point rather than an error.
    // "Head of [Function]" is a common food-industry title equivalent to VP/Director.
    if (!onetResult) {
      const t = onetTitle.toLowerCase();
      const seniorityFallback =
        /\b(chief|ceo|president|coo|cto|cfo|ciso|cmo|cro|chro)\b/.test(t)          ? { min: 215000, median: 300000, max: 420000, title: "C-Suite Executive" } :
        /\b(executive vice president|evp|senior vice president|svp)\b/.test(t)       ? { min: 200000, median: 290000, max: 420000, title: "SVP / EVP" } :
        /\b(vice president|vp)\b/.test(t)                                            ? { min: 155000, median: 215000, max: 300000, title: "Vice President" } :
        /\bhead of\b/.test(t)                                                        ? { min: 140000, median: 200000, max: 285000, title: "Head of Function (VP–Director equivalent)" } :
        /\bprincipal\b/.test(t)                                                      ? { min: 155000, median: 230000, max: 350000, title: "Principal" } :
        /\b(senior director)\b/.test(t)                                              ? { min: 140000, median: 195000, max: 270000, title: "Senior Director" } :
        /\b(director)\b/.test(t)                                                     ? { min: 115000, median: 160000, max: 220000, title: "Director" } :
        /\b(senior manager|sr\.? manager)\b/.test(t)                                 ? { min:  95000, median: 130000, max: 175000, title: "Senior Manager" } :
        /\b(manager)\b/.test(t)                                                      ? { min:  75000, median: 105000, max: 145000, title: "Manager" } :
        null;
      if (seniorityFallback) {
        console.log(`[salary-lookup] using seniority fallback for: "${safeTitle}" → ${seniorityFallback.title}`);
        return {
          statusCode: 200,
          headers: corsHeaders(origin),
          body: JSON.stringify({
            min:    seniorityFallback.min,
            median: seniorityFallback.median,
            max:    seniorityFallback.max,
            source: "Vetted Benchmark",
            occupationTitle: seniorityFallback.title,
          }),
        };
      }
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
