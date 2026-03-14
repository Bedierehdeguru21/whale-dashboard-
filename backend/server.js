const express = require("express");
const cors = require("cors");
const WebSocket = require("ws"); // ← added

require("./websocket");

const { getWhaleTransactions } = require("./whaleTracker");

const app = express();
app.use(cors());

// ── Existing HTTP endpoint ──
app.get("/whales", async (req, res) => {
  try {
    const data = await getWhaleTransactions();
    if (data.length === 0) {
      return res.json({
        message: "No whale transactions detected",
        data: []
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(3000, () => {
  console.log("Whale radar running 🐋");
});

// ── Optional root endpoint ──
app.get("/", (req, res) => {
  res.send("Server running");
});

// ── WebSocket setup ──
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  console.log("Frontend connected via WebSocket");

  // Send current whale transactions immediately
  getWhaleTransactions().then(data => ws.send(JSON.stringify(data)));

  // Optional: handle close
  ws.on("close", () => console.log("Frontend disconnected"));
});

// Broadcast whales every 10 seconds
const broadcastWhales = async () => {
  const data = await getWhaleTransactions();
  const message = JSON.stringify(data);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

setInterval(broadcastWhales, 10000); // every 10 seconds
