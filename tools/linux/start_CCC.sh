#!/usr/bin/env bash
# start_CCC.sh — Start CCC on Linux
# Place this file on your Desktop or wherever convenient.

cd "$(dirname "$0")/../.."

# Read port from .env (default 3000)
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2)
PORT="${PORT:-3000}"

# Check if already running
if ss -tlnp 2>/dev/null | grep -q ":$PORT " || lsof -ti :"$PORT" &>/dev/null 2>&1; then
  echo "CCC is already running on port $PORT."
  xdg-open "http://localhost:$PORT" 2>/dev/null || echo "Open http://localhost:$PORT in your browser."
  exit 0
fi

echo "Starting CCC on port $PORT..."
node server.js &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
    echo "CCC is running."
    xdg-open "http://localhost:$PORT" 2>/dev/null || echo "Open http://localhost:$PORT in your browser."
    echo ""
    echo "Press Ctrl+C to stop CCC."
    wait $SERVER_PID
    exit 0
  fi
  sleep 0.5
done

echo "Server failed to start within 15 seconds."
kill $SERVER_PID 2>/dev/null
exit 1
