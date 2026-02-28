#!/usr/bin/env bash
# start_CCC.command — Double-click to start CCC on macOS
# Place this file on your Desktop or wherever convenient.

cd "$(dirname "$0")/../.."

# Read port from .env (default 3000)
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2)
PORT="${PORT:-3000}"

# Check if already running
if lsof -ti :"$PORT" &>/dev/null; then
  echo "CCC is already running on port $PORT."
  open "http://localhost:$PORT"
  exit 0
fi

echo "Starting CCC on port $PORT..."
node server.js &
SERVER_PID=$!

# Wait for server to be ready
for i in {1..30}; do
  if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
    echo "CCC is running."
    open "http://localhost:$PORT"
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
