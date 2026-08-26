#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
load_payflow_env

command -v node >/dev/null || { echo "Node.js 20 or later is required." >&2; exit 1; }
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js 20 or later is required." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker Desktop is required." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker Desktop is not running." >&2; exit 1; }
if ! runner_is_active; then
  (
    cd "$AUTOMATION_DIR"
    nohup node runner/server.mjs > "$LOG_FILE" 2>&1 &
    echo "$!" > "$PID_FILE"
  )
fi

for _ in $(seq 1 30); do
  if curl -fsS -H "Authorization: Bearer $PAYFLOW_RUNNER_TOKEN" "http://127.0.0.1:${PAYFLOW_RUNNER_PORT:-5680}/health" >/dev/null; then
    break
  fi
  sleep 1
done
HEALTH="$(curl -fsS -H "Authorization: Bearer $PAYFLOW_RUNNER_TOKEN" "http://127.0.0.1:${PAYFLOW_RUNNER_PORT:-5680}/health")" || {
  echo "The host runner did not become healthy. Read $LOG_FILE." >&2
  exit 1
}
echo "$HEALTH"
case "$HEALTH" in
  *'"realReady":true'*) ;;
  *) echo "Real actions are not ready on engine ${PAYFLOW_ENGINE:-codex}. Demo mode is available. Authenticate the engine CLI before a real run." >&2 ;;
esac

docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" up -d
echo "n8n: http://localhost:5678"
echo "Runner log: $LOG_FILE"
echo "After owner setup, run: $AUTOMATION_DIR/bin/import-workflows.sh"
