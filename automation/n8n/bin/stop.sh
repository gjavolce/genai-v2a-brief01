#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
load_payflow_env
docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" down
if runner_is_active; then
  kill "$(runner_pid)"
else
  echo "No live PayFlow runner matched $PID_FILE. Nothing was killed."
fi
rm -f "$PID_FILE"
echo "Stopped n8n and the host runner. Persistent data and retained runs remain."
