#!/usr/bin/env bash
set -euo pipefail

AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$AUTOMATION_DIR/.env"
RUNS_DIR="${1:-}"

case "$RUNS_DIR" in
  /*) ;;
  *) echo "Use: [PAYFLOW_ENGINE=codex|claude] $0 /absolute/path/to/payflow-n8n-runs" >&2; exit 2 ;;
esac
if [ "$RUNS_DIR" = "/" ]; then
  echo "The run directory must not be the filesystem root." >&2
  exit 2
fi
if [ -e "$ENV_FILE" ]; then
  echo "$ENV_FILE already exists. It was not changed." >&2
  exit 1
fi

RUNNER_TOKEN="$(openssl rand -hex 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
ENGINE="${PAYFLOW_ENGINE:-codex}"
case "$ENGINE" in
  codex) ENGINE_MODEL="gpt-5.6-sol" ;;
  claude) ENGINE_MODEL="opus" ;;
  *) echo "PAYFLOW_ENGINE must be codex or claude." >&2; exit 2 ;;
esac
ENGINE_BIN="$(command -v "$ENGINE" || true)"
if [ -z "$ENGINE_BIN" ]; then
  ENGINE_BIN="$ENGINE"
  echo "The $ENGINE CLI was not found. Demo mode will work; install and authenticate it before a real run." >&2
fi
mkdir -p "$RUNS_DIR"
umask 077
{
  echo "PAYFLOW_RUNS_DIR=$RUNS_DIR"
  echo "PAYFLOW_REMOTE_URL=https://github.com/gjavolce/genai-v2a-brief01.git"
  echo "PAYFLOW_RUNNER_TOKEN=$RUNNER_TOKEN"
  echo "PAYFLOW_RUNNER_URL=http://host.docker.internal:5680"
  echo "PAYFLOW_RUNNER_HOST=127.0.0.1"
  echo "PAYFLOW_RUNNER_PORT=5680"
  echo "PAYFLOW_ENGINE=$ENGINE"
  echo "PAYFLOW_ENGINE_BIN=$ENGINE_BIN"
  echo "PAYFLOW_ENGINE_MODEL=$ENGINE_MODEL"
  echo "N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY"
  echo "GENERIC_TIMEZONE=Europe/London"
} > "$ENV_FILE"
echo "Created $ENV_FILE with mode 600. Engine: $ENGINE ($ENGINE_BIN, $ENGINE_MODEL)."
echo "Run: $AUTOMATION_DIR/bin/start.sh"
