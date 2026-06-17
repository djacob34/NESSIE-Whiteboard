# NESSIE WP3 & WP4 Implementation Timeline Board

A live, multi-user planning board for the four NESSIE lighthouses (Ameland, Samsø, Borkum, Morbihan) plus a shared WP4 board. Each board is a timeline from September 2026 to June 2027 (with an Aug–Sep 2027 reporting band). Activities are **variable-length duration bars** you can drag to move and drag by the right edge to resize — from a single-day event to a multi-month block. Everyone with the link edits the same boards in real time.

## What's in it

- **Five boards** via the tabs: Ameland, Samsø, Borkum, Morbihan, WP4 – shared.
- **Pre-filled** with suggested milestones (SACs, traineeships, ET-Intensives, E-Campus opening + workshops, teacher training, Samsø digitalisation, and the WP4 Advisory Board / Belgian replica / Final Conference).
- **Lanes per pillar** down the left, colour-coded bars across the timeline.
- **Edit anything**: click a bar to change its label, owner, colour, lane, start and duration. `+ Add activity` creates a new bar; each bar has a delete button.
- **Live collaboration** over WebSockets — open the link on several devices and watch edits appear instantly. The header shows how many people are online.
- **Download PNG** to capture the current board as the shared record.
- **Reset this board** restores the suggested layout for that one board (affects everyone).

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

## Deploy on Railway

1. Push this folder to a GitHub repo (or use `railway up` from the Railway CLI).
2. In Railway: **New Project → Deploy from GitHub repo** and pick the repo.
3. Railway auto-detects Node (Nixpacks), runs `npm install`, then `npm start`. No build config needed.
4. Railway sets the `PORT` environment variable automatically; the server already reads `process.env.PORT`.
5. Open **Settings → Networking → Generate Domain** to get the public URL. Share that link with the consortium — that's the collaborative board.

### Notes on data persistence
State is kept in memory and written to `data.json` so a restart within a deployment keeps the boards. Railway's container filesystem is **ephemeral across redeploys**, so if you want edits to survive a redeploy, attach a Railway **Volume** mounted at the project directory (or adapt `DATA_FILE` to point at the volume path). For a one-off workshop this isn't necessary.

## Tech
Node.js + Express (static hosting) + Socket.IO (real-time sync). No database or third-party accounts required. Single dependency-light app.
