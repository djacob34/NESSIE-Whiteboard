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
const DATA_FILE = path.join(__dirname, "data.json");

const ISLAND_LANES = ["SACs","Traineeships","ET-Intensives","E-Campus","Teacher training","Digitalisation"];
const WP4_LANES = ["Advisory Board","Replication","Final events","Milestones"];

let uid = 1;
const nid = () => "i" + (uid++);
const mk = (type, lane, start, end, label, owner, done) =>
  ({ id: nid(), type, lane, start, end, label: label || "", owner: owner || "", done: !!done });

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
    ameland:  { title: "Ameland",      lanes: ISLAND_LANES, items: [] },
    samso:    { title: "Samso",        lanes: ISLAND_LANES, items: [] },
    borkum:   { title: "Borkum",       lanes: ISLAND_LANES, items: [] },
    morbihan: { title: "Morbihan",     lanes: ISLAND_LANES, items: [] },
    wp4:      { title: "WP4 - Belgium", lanes: WP4_LANES,    items: wp4Items() },
  };
}

let state;
try {
  state = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  for (const b of Object.values(state)) for (const it of b.items) {
    const n = parseInt(String(it.id).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n >= uid) uid = n + 1;
  }
  console.log("Loaded saved board state.");
} catch (e) {
  state = defaultState();
  console.log("Seeded fresh board state.");
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(state), err => { if (err) console.error("persist error", err); });
  }, 400);
}

const META = { origin: "2026-01-01", end: "2027-09-30", reportingStart: "2027-08-01" };

app.use(express.static(path.join(__dirname, "public")));
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
