#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ilinuxstats"
mkdir -p "$STATE_DIR"
PID_FILE="$STATE_DIR/server.pid"
PORT="${ILINUXSTATS_PORT:-8765}"
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  :
else
  nohup python3 "$APP_DIR/server.py" >"$STATE_DIR/server.log" 2>&1 &
  echo $! > "$PID_FILE"
  for _ in {1..30}; do
    if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
fi
URL="http://127.0.0.1:$PORT/"
if command -v chromium >/dev/null 2>&1; then chromium --app="$URL" >/dev/null 2>&1 &
elif command -v chromium-browser >/dev/null 2>&1; then chromium-browser --app="$URL" >/dev/null 2>&1 &
else xdg-open "$URL" >/dev/null 2>&1 & fi
