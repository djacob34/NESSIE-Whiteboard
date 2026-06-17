/*
 * NESSIE WP3 & WP4 Implementation Timeline Board
 * Collaborative, multi-user timeline. Express serves the client; Socket.IO syncs state live.
 * State is held in memory and persisted to data.json (best-effort) so a restart keeps the boards.
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

// ---- Colour palette (pillars) ----
const C = {
  sac: "#FFE27A",        // SACs - yellow
  traineeship: "#B7E1A1",// Traineeships - green
  et: "#9FE0D3",         // ET-Intensives - teal/mint
  ecampus: "#A9CCEC",    // E-Campus - blue
  teacher: "#F6BE99",    // Teacher Training - orange
  digital: "#EEB8DA",    // Digitalisation - pink
  wp4: "#C9B3E6",        // WP4 Replication - purple
  milestone: "#F0AFA9",  // Milestones - red
};

// Months: Sep 2026 .. Sep 2027. Each month = 30 units. Delivery window 0..300 (Sep26-Jun27).
const MONTHS = ["Sep '26","Oct '26","Nov '26","Dec '26","Jan '27","Feb '27","Mar '27","Apr '27","May '27","Jun '27","Jul '27","Aug '27","Sep '27"];
const REPORTING_START = 300; // Jul '27 onward = reporting / processing

const LIGHTHOUSE_LANES = ["SACs","Traineeships","ET-Intensives","E-Campus","Teacher training"];
const SAMSO_LANES = ["SACs","Traineeships","ET-Intensives","E-Campus","Teacher training","Digitalisation"];
const WP4_LANES = ["Advisory Board","Replication","Final events"];

let uid = 1;
const nid = () => "i" + (uid++);

function lighthouseItems(extraDigital) {
  const items = [
    { lane: 4, start: 0,   len: 60,  label: "Teacher training (10 teachers)",        color: C.teacher,     owner: "" },
    { lane: 0, start: 30,  len: 14,  label: "SAC 1",                                  color: C.sac,         owner: "" },
    { lane: 0, start: 180, len: 14,  label: "SAC 2",                                  color: C.sac,         owner: "" },
    { lane: 1, start: 30,  len: 90,  label: "Traineeship R1 (~8)",                    color: C.traineeship, owner: "" },
    { lane: 1, start: 120, len: 90,  label: "Traineeship R2 (~8)",                    color: C.traineeship, owner: "" },
    { lane: 1, start: 210, len: 90,  label: "Traineeship R3 (~8)",                    color: C.traineeship, owner: "" },
    { lane: 2, start: 120, len: 7,   label: "ET-Intensive 1 (20 students)",           color: C.et,          owner: "" },
    { lane: 2, start: 240, len: 7,   label: "ET-Intensive 2 (20 students)",           color: C.et,          owner: "" },
    { lane: 3, start: 60,  len: 4,   label: "E-Campus opening (VIP)",                 color: C.ecampus,     owner: "" },
    { lane: 3, start: 66,  len: 204, label: "E-Campus workshops (12)",                color: C.ecampus,     owner: "" },
  ];
  if (extraDigital) {
    items.push(
      { lane: 5, start: 60,  len: 12, label: "Hybrid SAC 1 (online)", color: C.digital, owner: "Samso Energy Academy" },
      { lane: 5, start: 120, len: 12, label: "Hybrid SAC 2 (online)", color: C.digital, owner: "Samso Energy Academy" },
      { lane: 5, start: 180, len: 12, label: "Hybrid SAC 3 (online)", color: C.digital, owner: "Samso Energy Academy" },
      { lane: 5, start: 240, len: 12, label: "Hybrid SAC 4 (online)", color: C.digital, owner: "Samso Energy Academy" },
    );
  }
  return items.map(it => ({ id: nid(), ...it }));
}

function wp4Items() {
  return [
    { lane: 1, start: 0,   len: 60, label: "Call of Interest - Belgian outreach", color: C.wp4,       owner: "Flux50 / NEC" },
    { lane: 0, start: 60,  len: 4,  label: "Advisory Board Meeting 2",             color: C.wp4,       owner: "Advisory Board" },
    { lane: 1, start: 120, len: 6,  label: "Early adopter kick-off (BE)",          color: C.wp4,       owner: "Flux50 / NEC" },
    { lane: 1, start: 210, len: 45, label: "Replica test run (BE early adopters)", color: C.wp4,       owner: "Belgian early adopters" },
    { lane: 0, start: 270, len: 4,  label: "Advisory Board Meeting 3 (+ KERs)",    color: C.wp4,       owner: "Advisory Board" },
    { lane: 2, start: 285, len: 5,  label: "Final Conference",                     color: C.milestone, owner: "Consortium" },
    { lane: 2, start: 278, len: 5,  label: "Final reflection workshop",            color: C.milestone, owner: "BBS Borkum" },
  ].map(it => ({ id: nid(), ...it }));
}

function defaultState() {
  return {
    ameland:  { title: "Ameland",       lanes: LIGHTHOUSE_LANES, items: lighthouseItems(false) },
    samso:    { title: "Samso",         lanes: SAMSO_LANES,      items: lighthouseItems(true)  },
    borkum:   { title: "Borkum",        lanes: LIGHTHOUSE_LANES, items: lighthouseItems(false) },
    morbihan: { title: "Morbihan",      lanes: LIGHTHOUSE_LANES, items: lighthouseItems(false) },
    wp4:      { title: "WP4 - shared",  lanes: WP4_LANES,        items: wp4Items()             },
  };
}

let state;
try {
  state = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  // keep uid ahead of any existing ids
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

const META = { months: MONTHS, reportingStart: REPORTING_START, palette: C };

app.use(express.static(path.join(__dirname, "public")));

let online = 0;

io.on("connection", socket => {
  online++;
  io.emit("presence", online);
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

  socket.on("disconnect", () => {
    online = Math.max(0, online - 1);
    io.emit("presence", online);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("NESSIE timeline board listening on " + PORT));
