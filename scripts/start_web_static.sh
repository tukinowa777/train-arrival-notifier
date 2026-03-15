#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/train-arrival-notifier"
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$LOG_DIR/web_static_server.pid"
SERVER_LOG="$LOG_DIR/web_static_server.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Static server already running: $EXISTING_PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

echo "Exporting web bundle..."
npx expo export --platform web >>"$SERVER_LOG" 2>&1

echo "Starting static web server on :8081 ..."
setsid python3 -m http.server 8081 --directory dist >>"$SERVER_LOG" 2>&1 < /dev/null &
SERVER_PID=$!
echo "$SERVER_PID" >"$PID_FILE"

sleep 2

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Static server started: $SERVER_PID"
  exit 0
fi

echo "Failed to start static server" >&2
exit 1
