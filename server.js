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

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "30mb" }));

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
    if (i >= 0) arr[i] = item; else arr.push(item);
    socket.broadcast.emit("item:upsert", { board, item });
    persist();
  });

  socket.on("item:add", ({ board, item }, ack) => {
    if (!state[board] || !item) return;
    item.id = nid();
    state[board].items.push(item);
    io.emit("item:upsert", { board, item });
    persist();
    if (typeof ack === "function") ack(item);
  });

  socket.on("item:remove", ({ board, id }) => {
    if (!state[board]) return;
    state[board].items = state[board].items.filter(x => x.id !== id);
    socket.broadcast.emit("item:remove", { board, id });
    persist();
  });

  socket.on("board:reset", ({ board }) => {
    const fresh = defaultState();
    if (!fresh[board]) return;
    state[board] = fresh[board];
    io.emit("board:replace", { board, data: state[board] });
    persist();
  });

  socket.on("disconnect", () => { online = Math.max(0, online - 1); io.emit("presence", online); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("NESSIE timeline board listening on " + PORT));
