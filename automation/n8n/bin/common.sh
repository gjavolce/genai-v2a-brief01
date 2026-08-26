#!/usr/bin/env bash
set -euo pipefail

AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$AUTOMATION_DIR/.env"
PID_FILE="$AUTOMATION_DIR/runner.pid"
LOG_FILE="$AUTOMATION_DIR/runner.log"

load_payflow_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE. Run: $AUTOMATION_DIR/bin/setup.sh /absolute/path/to/payflow-n8n-runs" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  case "${PAYFLOW_RUNS_DIR:-}" in
    /*) ;;
    *) echo "PAYFLOW_RUNS_DIR must be an absolute path." >&2; exit 1 ;;
  esac
}

# A stale PID file after a reboot can name a reused, unrelated PID. Confirm the command too.
runner_is_active() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$PID_FILE")"
  case "$pid" in '' | *[!0-9]*) return 1 ;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  ps -o command= -p "$pid" 2>/dev/null | grep -q 'runner/server\.mjs'
}

runner_pid() {
  tr -d '[:space:]' < "$PID_FILE"
}
