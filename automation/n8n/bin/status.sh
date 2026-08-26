#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
load_payflow_env
curl -fsS -H "Authorization: Bearer $PAYFLOW_RUNNER_TOKEN" "http://127.0.0.1:${PAYFLOW_RUNNER_PORT:-5680}/health"
echo ""
docker compose --env-file "$ENV_FILE" -f "$AUTOMATION_DIR/compose.yml" ps
echo ""
(cd "$AUTOMATION_DIR" && npm run --silent status)
