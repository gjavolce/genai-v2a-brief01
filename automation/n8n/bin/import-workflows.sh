#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
load_payflow_env
docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" exec -T n8n \
  n8n import:workflow --input=/workflows/payflow-poll-job.json
docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" exec -T n8n \
  n8n import:workflow --input=/workflows/payflow-orchestrator.json
echo "Imported both workflows. Open http://localhost:5678 and activate PayFlow Feature Orchestrator."
