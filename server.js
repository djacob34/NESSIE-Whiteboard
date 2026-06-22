/*
 * NESSIE WP3 & WP4 Implementation Timeline Board
 * Collaborative, multi-user timeline (Jan 2026 - Sep 2027).
 * Express serves the client; Socket.IO syncs state live.
 * State is held in memory and persisted to data.json (best-effort).
 */
const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const mammoth = require("mammoth");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
// Where the live board state is persisted. Point DATA_FILE (or DATA_DIR) at a
// PERSISTENT volume in production (e.g. a Railway Volume mounted at /data) so
// partner edits survive redeploys. Defaults to the app folder for local dev.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, "data.json");
// Optional one-time migration snapshot: on the very first boot at a fresh
// persistent location (empty volume), seed from this bundled file instead of
// the built-in defaults, so existing partner data is preserved. Ignored once
// DATA_FILE exists.
const SEED_FILE = path.join(__dirname, "seed-data.json");

const ISLAND_LANES = ["NESSIE phases","Recruitment","SACs","Traineeships","ET-Intensives","E-Campus","Teacher training","Digitalisation"];
const WP4_LANES = ["Advisory Board","Replication","Final events","Milestones"];

let uid = 1;
const nid = () => "i" + (uid++);
const mk = (type, lane, start, end, label, owner, done) =>
  ({ id: nid(), type, lane, start, end, label: label || "", owner: owner || "", done: !!done });

// NESSIE multi-year programme phases (all islands share this top lane).
// Lane 0 "NESSIE phases" — long bars spanning the four-year arc 2023 → 2027.
function nessiePhases() {
  return [
    mk("phase", 0, "2023-10-01", "2023-12-31", "2023 · Establish team",                     "", true),
    mk("phase", 0, "2024-01-01", "2024-12-31", "2024 · Orientation (list of SACs)",          "", true),
    mk("phase", 0, "2025-01-01", "2025-12-31", "2025 · Development & design of SACs",         "", true),
    mk("phase", 0, "2026-01-01", "2026-12-31", "2026 · Implementation & KPI delivery",        ""),
    mk("phase", 0, "2027-01-01", "2027-03-31", "2027 Q1 · Completion & reporting",            ""),
  ];
}

// Generic lighthouse activities (islands). Lanes:
// 0 NESSIE phases · 1 Recruitment · 2 SACs · 3 Traineeships · 4 ET-Intensives
// 5 E-Campus · 6 Teacher training · 7 Digitalisation
function lighthouseItems(digital) {
  const a = [
    mk("teacher",            6, "2026-09-01", "2026-10-31", "Teacher training (10 teachers)", ""),
    mk("sac",                2, "2026-10-12", "2026-10-25", "SAC 1", ""),
    mk("sac",                2, "2027-03-01", "2027-03-14", "SAC 2", ""),
    mk("traineeship",        3, "2026-10-01", "2026-12-31", "Traineeship R1 (~8)", ""),
    mk("traineeship",        3, "2027-01-15", "2027-03-31", "Traineeship R2 (~8)", ""),
    mk("traineeship",        3, "2027-04-01", "2027-06-30", "Traineeship R3 (~8)", ""),
    mk("et",                 4, "2027-01-19", "2027-01-25", "ET-Intensive 1 (20 students)", ""),
    mk("et",                 4, "2027-05-11", "2027-05-17", "ET-Intensive 2 (20 students)", ""),
    mk("ecampus_open",       5, "2026-11-15", "2026-11-17", "E-Campus opening (VIP)", ""),
    mk("ecampus_workshops",  5, "2026-11-20", "2027-06-30", "E-Campus workshops (12)", ""),
  ];
  if (digital) {
    a.push(
      mk("digital", 7, "2026-11-01", "2026-11-12", "Hybrid SAC 1 (online)", "Samso Energy Academy"),
      mk("digital", 7, "2027-01-10", "2027-01-21", "Hybrid SAC 2 (online)", "Samso Energy Academy"),
      mk("digital", 7, "2027-03-10", "2027-03-21", "Hybrid SAC 3 (online)", "Samso Energy Academy"),
      mk("digital", 7, "2027-05-10", "2027-05-21", "Hybrid SAC 4 (online)", "Samso Energy Academy"),
    );
  }
  return a;
}

// Ameland 2026 implementation schedule (verbatim from the implementation plan).
// Lanes: 1 Recruitment · 2 SACs · 3 Traineeships · 6 Teacher training
function amelandItems() {
  return [
    // --- Recruitment / "Student for a day" & inspiration (lane 1) ---
    mk("recruitment", 1, "2026-01-14", "2026-01-14", "Student for a day (Building Tech, VMBO · Buddy)", ""),
    mk("recruitment", 1, "2026-01-28", "2026-01-28", "Student for a day",                               ""),
    mk("recruitment", 1, "2026-01-29", "2026-01-29", "Information Day",                                 ""),
    mk("recruitment", 1, "2026-03-12", "2026-03-12", "Activity Day (Buddy)",                            ""),
    mk("recruitment", 1, "2026-03-19", "2026-03-19", "Student for a day (Energy)",                      ""),
    mk("recruitment", 1, "2026-03-26", "2026-03-26", "Student for a day (Energy)",                      ""),
    mk("recruitment", 1, "2026-04-14", "2026-04-14", "Girl's Day (30 · Buddy)",                         ""),

    // --- SACs / Energy Tours & Inspiration Sessions (lane 2) ---
    mk("sac", 2, "2026-06-17", "2026-06-17", "Energy Tour (12 electrical students)",                ""),
    mk("sac", 2, "2026-08-20", "2026-08-20", "Energy Tour Intro Week (85 Building)",                ""),
    mk("sac", 2, "2026-08-21", "2026-08-21", "Energy Tour Intro Week (45 Energy)",                  ""),
    mk("sac", 2, "2026-10-21", "2026-10-21", "Breakfast Inspiration Session (50 upskillers)",       ""),
    mk("sac", 2, "2026-11-25", "2026-11-25", "Energy mgmt/storage Breakfast Inspiration (50 upskillers)", ""),

    // --- Traineeships / Integrated Building Practical (lane 3) ---
    mk("traineeship", 3, "2026-02-12", "2026-02-12", "Integrated Building Practical Day 1 (9 Smart Building)", ""),
    mk("traineeship", 3, "2026-03-12", "2026-03-12", "Integrated Building Practical Day 2 (9)",      ""),
    mk("traineeship", 3, "2026-03-25", "2026-03-25", "Integrated Building Practical Day 3 (9)",      ""),
    mk("traineeship", 3, "2026-04-16", "2026-04-16", "Integrated Building Practical Day 4 (9)",      ""),
    mk("traineeship", 3, "2026-09-01", "2026-09-30", "Integrated Building HSB",                      ""),

    // --- Teacher training (lane 6) ---
    mk("teacher", 6, "2026-04-15", "2026-04-15", "Training EM/S (13 teachers)", ""),
    mk("teacher", 6, "2026-06-10", "2026-06-10", "Training EM/S (4 teachers)",  ""),

    // --- 2027 ---
    mk("recruitment", 1, "2027-04-01", "2027-04-30", "Girl's Day (Buddy)", ""),
  ];
}

// WP4 (Replication) board seeded from the WP4 management plan.
// Lanes: 0 Advisory Board · 1 Replication · 2 Final events · 3 Milestones
function wp4Items() {
  return [
    // --- Milestones (lane 3) ---
    mk("ga",        3, "2026-05-18", "2026-05-20", "General Assembly (Morbihan)",        "Consortium"),
    mk("milestone", 3, "2026-09-30", "2026-09-30", "Feasibility study complete",          "Matilde"),
    mk("milestone", 3, "2026-10-31", "2026-10-31", "Replication plan complete (T4.3)",    "Matilde"),
    mk("milestone", 3, "2027-04-30", "2027-04-30", "40-org capacity indicator target",    "Matilde / Armin"),

    // --- Advisory Board (lane 0) · T4.1 ---
    mk("advisory",  0, "2026-06-15", "2026-06-18", "Advisory Board meeting",              "Armin / Dani"),
    mk("advisory",  0, "2026-11-01", "2026-11-15", "AB / working-group plan validation",  "Matilde / Dani"),

    // --- Replication (lane 1) · T4.2 & T4.3 ---
    mk("callofinterest", 1, "2026-05-15", "2026-06-30", "Call of Interest – Belgian outreach (Flux50)", "Matilde"),
    mk("earlyadopter",   1, "2026-05-21", "2026-09-30", "Regional ecosystem mapping (T4.2)",            "Matilde"),
    mk("replica",        1, "2026-06-01", "2026-09-30", "Collaboration Framework + Intra-EU learning",  "Dani"),
    mk("replica",        1, "2026-09-01", "2026-10-31", "Feasibility study (T4.3)",                      "Matilde"),
    mk("earlyadopter",   1, "2026-10-01", "2026-10-31", "Confirm Belgian early adopters",                "Matilde"),
    mk("replica",        1, "2026-10-01", "2026-10-31", "Write modular replication plan (T4.3)",         "Matilde"),
    mk("earlyadopter",   1, "2026-06-01", "2027-04-30", "Institutional capacity survey (→ 40 orgs)",     "Matilde / Armin"),
    mk("replica",        1, "2026-11-01", "2026-12-31", "4 × pillar E-guides",                           "Dani"),
    mk("earlyadopter",   1, "2026-11-01", "2027-04-30", "Early-adopter support (E-Campus/SAC/traineeship/recruitment)", "Matilde"),
    mk("replica",        1, "2027-01-01", "2027-03-31", "Webinar series – best practices",              "Matilde / Dani"),
    mk("replica",        1, "2026-11-01", "2027-07-31", "KPI monitoring across replication sites",       "Matilde"),

    // --- Final events (lane 2) · T4.4 & T4.5 ---
    mk("reflection", 2, "2027-07-01", "2027-07-31", "Test-case evaluation (T4.4)",        "Matilde"),
    mk("conference", 2, "2027-09-14", "2027-09-27", "NESSIE Final Conference (T4.5)",     "Matilde / Dani"),
  ];
}

function defaultState() {
  return {
    ameland:  { title: "Ameland",      lanes: ISLAND_LANES, items: [...nessiePhases(), ...amelandItems()] },
    samso:    { title: "Samso",        lanes: ISLAND_LANES, items: [...nessiePhases(), ...lighthouseItems(true)]  },
    borkum:   { title: "Borkum",       lanes: ISLAND_LANES, items: [...nessiePhases(), ...lighthouseItems(false)] },
    morbihan: { title: "Morbihan",     lanes: ISLAND_LANES, items: [...nessiePhases(), ...lighthouseItems(false)] },
    wp4:      { title: "WP4 - Belgium", lanes: WP4_LANES,    items: wp4Items() },
  };
}

function reindexUid(s) {
  for (const b of Object.values(s)) for (const it of b.items) {
    const n = parseInt(String(it.id).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n >= uid) uid = n + 1;
  }
}

let state;
let loaded = false;
const dataFileExists = fs.existsSync(DATA_FILE);
if (dataFileExists) {
  // Existing persisted state always wins (this is the live partner data).
  try {
    state = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    reindexUid(state);
    loaded = true;
    console.log("Loaded saved board state from " + DATA_FILE);
  } catch (e) {
    // The file exists but is unreadable/corrupt. NEVER overwrite it with
    // defaults — preserve it untouched for recovery and boot from a fallback.
    const bad = DATA_FILE + ".corrupt-" + Date.now();
    try { fs.copyFileSync(DATA_FILE, bad); } catch (_) {}
    console.error("Corrupt data file at " + DATA_FILE + " — preserved copy at " + bad + "; NOT overwriting.", e);
  }
}
if (!loaded) {
  // No usable file yet (fresh install or empty volume). Prefer a bundled
  // migration snapshot of partner data if present; otherwise use defaults.
  try {
    state = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    reindexUid(state);
    console.log("Seeded board state from migration snapshot " + SEED_FILE);
  } catch (e2) {
    state = defaultState();
    console.log("Seeded fresh default board state.");
  }
  // Populate the persistent location on first boot only. Never clobber an
  // existing file (it may be corrupt-but-recoverable partner data).
  if (!dataFileExists) {
    try { writeStateSync(); } catch (err) { console.error("initial persist error", err); }
  }
}

// Atomic write: serialize to a temp file then rename over the real file. rename
// is atomic on the same filesystem, so a crash mid-write can never leave a
// half-written (corrupt) data.json that would be unreadable on the next boot.
function writeStateSync() {
  const tmp = DATA_FILE + ".tmp";
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, DATA_FILE);
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { writeStateSync(); } catch (err) { console.error("persist error", err); }
  }, 400);
}
// Write immediately and durably (used for imports and on shutdown) so nothing
// is lost in the debounce window when the container is being redeployed.
function persistSync() {
  clearTimeout(saveTimer);
  try { writeStateSync(); } catch (err) { console.error("persistSync error", err); }
}
// Railway (and most platforms) send SIGTERM before replacing the container on a
// redeploy; flush the latest state synchronously so in-flight edits survive.
let shuttingDown = false;
function gracefulExit() { if (shuttingDown) return; shuttingDown = true; persistSync(); process.exit(0); }
process.on("SIGTERM", gracefulExit);
process.on("SIGINT", gracefulExit);

const META = { origin: "2023-10-01", end: "2027-09-30", reportingStart: "2027-08-01" };

// ---------------------------------------------------------------------------
// Undo / redo — server-owned per-board history so it is consistent for every
// collaborator. Each entry is a snapshot of a board's items taken BEFORE a
// mutation. Capped at HIST_MAX steps; rapid edits to the same item coalesce
// into a single step so typing a label is one undo, not one-per-keystroke.
// ---------------------------------------------------------------------------
const HIST_MAX = 10;
const hist = {};
function boardHist(board) { return hist[board] || (hist[board] = { undo: [], redo: [] }); }
function snap(board) { return JSON.parse(JSON.stringify(state[board].items)); }
let lastAct = { board: null, key: null, time: 0 };
// Record the pre-mutation state. Call BEFORE changing state[board].items.
// `key` truthy + same as the previous call within 1.5s => coalesced (no new step).
function pushHistory(board, key) {
  if (!state[board]) return;
  const now = Date.now();
  if (key && lastAct.board === board && lastAct.key === key && now - lastAct.time < 1500) { lastAct.time = now; return; }
  lastAct = { board, key: key || null, time: now };
  const h = boardHist(board);
  h.undo.push(snap(board));
  if (h.undo.length > HIST_MAX) h.undo.shift();
  h.redo.length = 0;
}
function histStatus(board) {
  const h = boardHist(board);
  return { board, canUndo: h.undo.length > 0, canRedo: h.redo.length > 0 };
}
function emitHist(board) { io.emit("history:status", histStatus(board)); }

// ---------------------------------------------------------------------------
// Word document parsing — extract milestone candidates (a date + a label) from
// an uploaded .docx. Handles tables (a date cell + description cells) and plain
// paragraphs / list items that contain an inline date.
// ---------------------------------------------------------------------------
const MONTHS_IDX = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
  january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11,sept:8 };
const pad2 = n => String(n).padStart(2, "0");
const iso = (y, m, d) => y + "-" + pad2(m + 1) + "-" + pad2(d);
// Detect the first date in a string. Returns { date:"YYYY-MM-DD", match:"<text>" } or null.
function detectDate(text) {
  if (!text) return null;
  let m;
  // ISO 2026-03-01 or 2026/03/01
  if ((m = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/))) {
    return { date: iso(+m[1], +m[2] - 1, +m[3]), match: m[0] };
  }
  // D Month YYYY  (1 October 2026 / 1st Oct 2026)
  if ((m = text.match(/\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s+(20\d{2})\b/))) {
    const mo = MONTHS_IDX[m[2].toLowerCase()]; if (mo != null) return { date: iso(+m[3], mo, +m[1]), match: m[0] };
  }
  // Month D, YYYY  (October 1, 2026 / Oct 1 2026)
  if ((m = text.match(/\b([A-Za-z]{3,9})\.?\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(20\d{2})\b/))) {
    const mo = MONTHS_IDX[m[1].toLowerCase()]; if (mo != null) return { date: iso(+m[3], mo, +m[2]), match: m[0] };
  }
  // DD/MM/YYYY (European order) or DD-MM-YYYY
  if ((m = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/))) {
    return { date: iso(+m[3], +m[2] - 1, +m[1]), match: m[0] };
  }
  // Quarter: Q1 2026 -> first month of quarter
  if ((m = text.match(/\bQ([1-4])\s*[-/ ]?\s*(20\d{2})\b/i))) {
    return { date: iso(+m[2], (+m[1] - 1) * 3, 1), match: m[0] };
  }
  // Month YYYY (October 2026) -> first of month
  if ((m = text.match(/\b([A-Za-z]{3,9})\.?\s+(20\d{2})\b/))) {
    const mo = MONTHS_IDX[m[1].toLowerCase()]; if (mo != null) return { date: iso(+m[2], mo, 1), match: m[0] };
  }
  return null;
}
const stripTags = s => s.replace(/<[^>]+>/g, " ");
const decodeEnt = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const cleanText = s => decodeEnt(stripTags(s)).replace(/\s+/g, " ").trim();
// Parse mammoth HTML into milestone candidates [{date,label}].
function parseMilestones(html) {
  const out = [];
  const seen = new Set();
  const add = (date, label) => {
    label = (label || "").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").trim();
    if (!date) return;
    if (label.length > 160) label = label.slice(0, 157) + "…";
    const key = date + "|" + label.toLowerCase();
    if (seen.has(key)) return; seen.add(key);
    out.push({ date, label: label || "Milestone" });
  };
  // Tables first: a row with a date cell becomes a milestone.
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  for (const tbl of tables) {
    const rows = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(cleanText);
      if (!cells.length) continue;
      let dateCell = -1, found = null;
      for (let i = 0; i < cells.length; i++) { const d = detectDate(cells[i]); if (d) { dateCell = i; found = d; break; } }
      if (!found) continue;
      const others = cells.filter((_, i) => i !== dateCell).filter(Boolean);
      let label = others.sort((a, b) => b.length - a.length)[0] || "";
      // if the date cell carried extra words, use them when no other cell has text
      if (!label) label = cleanText(cells[dateCell].replace(found.match, ""));
      add(found.date, label);
    }
  }
  // Then paragraphs / list items / headings with an inline date.
  const htmlNoTables = html.replace(/<table[\s\S]*?<\/table>/gi, " ");
  const blocks = htmlNoTables.match(/<(?:p|li|h[1-6])[^>]*>[\s\S]*?<\/(?:p|li|h[1-6])>/gi) || [];
  for (const b of blocks) {
    const t = cleanText(b);
    const d = detectDate(t);
    if (!d) continue;
    add(d.date, cleanText(t.replace(d.match, " ")));
  }
  return out;
}

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "30mb" }));

// Parse an uploaded .docx and return milestone candidates (no state change).
app.post("/parse-doc",
  express.raw({ type: ["application/octet-stream", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], limit: "25mb" }),
  async (req, res) => {
    try {
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
        return res.status(400).json({ error: "Not a .docx file (expected a Word document)." });
      }
      const result = await mammoth.convertToHtml({ buffer: buf });
      const milestones = parseMilestones(result.value || "");
      res.json({ milestones, count: milestones.length });
    } catch (err) {
      console.error("parse-doc error", err);
      res.status(500).json({ error: "Could not read that document." });
    }
  }
);

// --- One-time migration / backup endpoints (disabled unless ADMIN_TOKEN is set) ---
// Used to snapshot the live partner data and load it onto a persistent volume
// without ever placing that data in the (public) repo. Send the token in the
// "x-admin-token" header.
function adminOK(req) { const t = process.env.ADMIN_TOKEN; return !!t && req.get("x-admin-token") === t; }

app.get("/admin/export", (req, res) => {
  if (!adminOK(req)) return res.status(403).json({ error: "forbidden" });
  res.json(state);
});

app.post("/admin/import", (req, res) => {
  if (!adminOK(req)) return res.status(403).json({ error: "forbidden" });
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return res.status(400).json({ error: "bad payload" });
  for (const [k, b] of Object.entries(incoming)) {
    if (!b || !Array.isArray(b.lanes) || !Array.isArray(b.items)) return res.status(400).json({ error: "invalid board: " + k });
  }
  state = incoming;
  reindexUid(state);
  for (const k of Object.keys(hist)) delete hist[k]; // history no longer applies
  persistSync();
  for (const board of Object.keys(state)) io.emit("board:replace", { board, data: state[board] });
  res.json({ ok: true, boards: Object.keys(state) });
});

let online = 0;

io.on("connection", socket => {
  online++; io.emit("presence", online);
  socket.emit("init", { state, meta: META });

  socket.on("item:upsert", ({ board, item }) => {
    if (!state[board] || !item || !item.id) return;
    const arr = state[board].items;
    const i = arr.findIndex(x => x.id === item.id);
    pushHistory(board, "upsert:" + item.id);
    if (i >= 0) arr[i] = item; else arr.push(item);
    socket.broadcast.emit("item:upsert", { board, item });
    emitHist(board);
    persist();
  });

  socket.on("item:add", ({ board, item }, ack) => {
    if (!state[board] || !item) return;
    pushHistory(board, null);
    item.id = nid();
    state[board].items.push(item);
    io.emit("item:upsert", { board, item });
    emitHist(board);
    persist();
    if (typeof ack === "function") ack(item);
  });

  // Add many items at once (e.g. milestones imported from a Word doc) as a
  // single undo step.
  socket.on("items:addBatch", ({ board, items }, ack) => {
    if (!state[board] || !Array.isArray(items) || !items.length) { if (typeof ack === "function") ack({ count: 0 }); return; }
    pushHistory(board, null);
    const added = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const it = { id: nid(), type: raw.type || "milestone", lane: raw.lane | 0,
        start: raw.start, end: raw.end || raw.start, label: (raw.label || "").slice(0, 200),
        owner: (raw.owner || "").slice(0, 120), done: !!raw.done };
      if (!it.start) continue;
      state[board].items.push(it);
      added.push(it);
    }
    io.emit("items:addBatch", { board, items: added });
    emitHist(board);
    persist();
    if (typeof ack === "function") ack({ count: added.length });
  });

  socket.on("item:remove", ({ board, id }) => {
    if (!state[board]) return;
    pushHistory(board, null);
    state[board].items = state[board].items.filter(x => x.id !== id);
    socket.broadcast.emit("item:remove", { board, id });
    emitHist(board);
    persist();
  });

  socket.on("board:reset", ({ board }) => {
    const fresh = defaultState();
    if (!fresh[board]) return;
    pushHistory(board, null);
    state[board] = fresh[board];
    io.emit("board:replace", { board, data: state[board] });
    emitHist(board);
    persist();
  });

  socket.on("history:undo", ({ board }) => {
    const h = hist[board]; if (!h || !h.undo.length || !state[board]) return;
    h.redo.push(snap(board));
    if (h.redo.length > HIST_MAX) h.redo.shift();
    state[board].items = h.undo.pop();
    lastAct = { board: null, key: null, time: 0 };
    io.emit("board:replace", { board, data: state[board] });
    emitHist(board);
    persist();
  });

  socket.on("history:redo", ({ board }) => {
    const h = hist[board]; if (!h || !h.redo.length || !state[board]) return;
    h.undo.push(snap(board));
    if (h.undo.length > HIST_MAX) h.undo.shift();
    state[board].items = h.redo.pop();
    lastAct = { board: null, key: null, time: 0 };
    io.emit("board:replace", { board, data: state[board] });
    emitHist(board);
    persist();
  });

  // A client asks for the current undo/redo availability of a board (on load
  // and when switching tabs).
  socket.on("history:query", ({ board }) => {
    if (!state[board]) return;
    socket.emit("history:status", histStatus(board));
  });

  socket.on("disconnect", () => { online = Math.max(0, online - 1); io.emit("presence", online); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("NESSIE timeline board listening on " + PORT));
