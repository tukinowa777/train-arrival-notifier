#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/train-arrival-notifier"
PID_FILE="$PROJECT_DIR/logs/web_static_server.pid"
SUPERVISOR_PID_FILE="$PROJECT_DIR/logs/web_static_supervisor.pid"

if [[ -f "$SUPERVISOR_PID_FILE" ]]; then
  SUPERVISOR_PID="$(cat "$SUPERVISOR_PID_FILE")"
  if kill -0 "$SUPERVISOR_PID" 2>/dev/null; then
    kill "$SUPERVISOR_PID" || true
  fi
  rm -f "$SUPERVISOR_PID_FILE"
fi

if [[ -f "$PID_FILE" ]]; then
  SERVER_PID="$(cat "$PID_FILE")"
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" || true
  fi
  rm -f "$PID_FILE"
fi

echo "Static web supervisor stopped"
