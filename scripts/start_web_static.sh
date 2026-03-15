#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/train-arrival-notifier"
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$LOG_DIR/web_static_server.pid"
SUPERVISOR_PID_FILE="$LOG_DIR/web_static_supervisor.pid"
SERVER_LOG="$LOG_DIR/web_static_server.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

if [[ -f "$SUPERVISOR_PID_FILE" ]]; then
  EXISTING_PID="$(cat "$SUPERVISOR_PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Static web supervisor already running: $EXISTING_PID"
    exit 0
  fi
  rm -f "$SUPERVISOR_PID_FILE"
fi

if [[ -f "$PID_FILE" ]]; then
  STALE_PID="$(cat "$PID_FILE")"
  if kill -0 "$STALE_PID" 2>/dev/null; then
    kill "$STALE_PID" || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

echo "Exporting web bundle..."
npx expo export --platform web >>"$SERVER_LOG" 2>&1

echo "Starting static web supervisor on :8081 ..."
setsid bash scripts/web_static_supervisor.sh >>"$LOG_DIR/web_static_supervisor.log" 2>&1 < /dev/null &
SUPERVISOR_PID=$!
echo "$SUPERVISOR_PID" >"$SUPERVISOR_PID_FILE"

sleep 3

if kill -0 "$SUPERVISOR_PID" 2>/dev/null && [[ -f "$PID_FILE" ]]; then
  echo "Static web supervisor started: $SUPERVISOR_PID"
  exit 0
fi

echo "Failed to start static web supervisor" >&2
exit 1
