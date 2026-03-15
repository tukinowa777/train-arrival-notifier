#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/train-arrival-notifier"
LOG_DIR="$PROJECT_DIR/logs"
SERVER_PID_FILE="$LOG_DIR/web_static_server.pid"
SUPERVISOR_LOG="$LOG_DIR/web_static_supervisor.log"
PORT="8081"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

is_port_open() {
  python3 - "$PORT" <<'PY'
import socket
import sys

port = int(sys.argv[1])
s = socket.socket()
s.settimeout(1)
try:
    s.connect(("127.0.0.1", port))
except Exception:
    print("closed")
else:
    print("open")
finally:
    s.close()
PY
}

while true; do
  if [[ -f "$SERVER_PID_FILE" ]]; then
    SERVER_PID="$(cat "$SERVER_PID_FILE")"
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      sleep 5
      continue
    fi
    rm -f "$SERVER_PID_FILE"
  fi

  if [[ "$(is_port_open)" == "open" ]]; then
    {
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] port ${PORT} already served by another process"
    } >>"$SUPERVISOR_LOG"
    sleep 5
    continue
  fi

  {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] restarting static web server"
  } >>"$SUPERVISOR_LOG"

  python3 scripts/spa_static_server.py --port "$PORT" --directory dist >>"$LOG_DIR/web_static_server.log" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" >"$SERVER_PID_FILE"

  sleep 2
done
