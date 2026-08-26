#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
load_payflow_env

compose() {
  docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" "$@"
}

# Import the sub-workflow first. The orchestrator references it by ID.
for name in payflow-poll-job payflow-orchestrator; do
  compose exec -T n8n n8n import:workflow --input="/workflows/$name.json"
done

# An import writes active=false from the file. Without this step the production
# form URL returns 404.
for id in payflow-poll-job payflow-feature-orchestrator; do
  compose exec -T n8n n8n update:workflow --id="$id" --active=true >/dev/null
done

# n8n registers the form webhook at start-up only.
compose restart >/dev/null
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:5678/rest/settings" >/dev/null 2>&1; then break; fi
  sleep 1
done

STATUS="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:5678/form/payflow")"
case "$STATUS" in
  302 | 200) echo "Imported and activated both workflows. Open http://localhost:5678 and sign in, then open the form." ;;
  *) echo "The form returned HTTP $STATUS. Open http://localhost:5678 and check that PayFlow Feature Orchestrator is active." >&2; exit 1 ;;
esac
