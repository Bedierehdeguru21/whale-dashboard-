#!/bin/bash
# ────────────────────────────────
# Whale Dashboard Launch Script
# Runs backend (Node.js) + frontend (Python HTTP server)
# ────────────────────────────────

# ── Paths ──
BACKEND_DIR="$HOME/whale-dashboard/backend"
FRONTEND_DIR="$HOME/whale-dashboard/front"

# ── Start backend ──
echo "Starting Node.js backend on port 3000..."
cd "$BACKEND_DIR" || { echo "Backend folder not found"; exit 1; }
node server.js &
BACKEND_PID=$!
echo "- Backend PID: $BACKEND_PID"

# ── Start frontend ──
echo "Starting frontend HTTP server on port 8080..."
cd "$FRONTEND_DIR" || { echo "Frontend folder not found"; exit 1; }
python3 -m http.server 8080 &
FRONTEND_PID=$!
echo "- Frontend PID: $FRONTEND_PID"

# ── Done ──
echo "Both frontend and backend are running!"
echo "Frontend → http://localhost:8080"
echo "Backend  → http://localhost:3000"
echo "Press CTRL+C to stop both servers."

# ── Wait for both processes (so script doesn’t exit) ──
wait $BACKEND_PID $FRONTEND_PID
