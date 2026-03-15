#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/train-arrival-notifier"
PID_FILE="$PROJECT_DIR/logs/web_static_server.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "PID file not found"
  exit 0
fi

SERVER_PID="$(cat "$PID_FILE")"

if kill -0 "$SERVER_PID" 2>/dev/null; then
  kill "$SERVER_PID"
fi

rm -f "$PID_FILE"
echo "Static server stopped"
