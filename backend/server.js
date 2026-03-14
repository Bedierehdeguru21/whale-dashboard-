const express = require("express");
const cors = require("cors");
const WebSocket = require("ws"); // make sure you require ws

const { getWhaleTransactions } = require("./whaleTracker");

const app = express();
app.use(cors());

// ─── REST ENDPOINT ───────────────────────────
app.get("/whales", async (req, res) => {
  try {
    const data = await getWhaleTransactions();
    if (data.length === 0) {
      return res.json({ message: "No whale transactions detected", data: [] });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE HTTP SERVER ───────────────────────
const server = require("http").createServer(app);

// ─── WEBSOCKET SERVER ────────────────────────
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected via WebSocket");

  // Example: send latest whale tx every 5s
  const interval = setInterval(async () => {
    const data = await getWhaleTransactions();
    ws.send(JSON.stringify(data));
  }, 5000);

  ws.on("close", () => clearInterval(interval));
});

// ─── START SERVER ────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Whale radar running 🐋 on port ${PORT}`);
});

app.get("/", (req, res) => res.send("Server running"));
