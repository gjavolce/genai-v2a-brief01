#!/usr/bin/env bash
# The green gate.
#
# docker compose up → health → smoke test.
set -uo pipefail

fail=0
step() { printf '▸ %-28s' "$1"; }
ok()   { echo "✅"; }
bad()  { echo "❌  $1"; fail=1; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-8080}"

echo ""
echo "Environment"
echo "────────────────────────────────────────────"

step "Docker"
if docker info >/dev/null 2>&1; then ok; else bad "Docker is not running"; fi

step "CLAUDE.md"
if [ -f "$ROOT/CLAUDE.md" ]; then ok; else bad "missing CLAUDE.md"; fi

step "Subagents"
n=$(ls -1 "$ROOT"/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${n:-0}" -ge 4 ]; then ok; else bad "expected 4 in .claude/agents, found ${n:-0}"; fi

step "Commands"
n=$(ls -1 "$ROOT"/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${n:-0}" -ge 3 ]; then ok; else bad "expected 3 in .claude/commands, found ${n:-0}"; fi

if [ "$fail" != "0" ]; then
  echo "────────────────────────────────────────────"
  echo "❌ The environment is not ready. Fix the above before running the app."
  exit 1
fi

echo ""
echo "Starting containers"
echo "────────────────────────────────────────────"

step "docker compose up"
if ( cd "$ROOT" && docker compose up -d --build ) > /tmp/verify-compose.$$ 2>&1; then
  ok
else
  bad "docker compose up failed"
  tail -25 /tmp/verify-compose.$$ | sed 's/^/    /'
  rm -f /tmp/verify-compose.$$
  exit 1
fi
rm -f /tmp/verify-compose.$$

echo ""
echo "Running application"
echo "────────────────────────────────────────────"

step "Backend healthy"
health_ok=0
for _ in $(seq 1 60); do
  if curl -sf "http://$API_HOST:$API_PORT/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
    health_ok=1
    break
  fi
  sleep 1
done
if [ "$health_ok" = "1" ]; then
  ok
else
  bad "the backend did not report healthy within 60 seconds on port $API_PORT"
  ( cd "$ROOT" && docker compose logs --tail=25 backend ) | sed 's/^/    /'
  exit 1
fi

step "GET /api/customers"
body="$(curl -s -o /tmp/verify-body.$$ -w '%{http_code}' "http://$API_HOST:$API_PORT/api/customers" 2>/dev/null)"
if [ "$body" = "200" ] && grep -q '"reference"' /tmp/verify-body.$$ 2>/dev/null; then
  ok
elif [ "$body" = "200" ]; then
  bad "the endpoint returned 200 but no customers — did the Flyway seed data load?"
else
  bad "GET /api/customers returned ${body:-no response}, expected 200"
fi
rm -f /tmp/verify-body.$$

echo "────────────────────────────────────────────"
if [ "$fail" = "0" ]; then
  echo "✅ All green."
  echo ""
  echo "   Now the part the shell cannot check for you:"
  echo "   1. Run /agents  → expect 4 subagents"
  echo "   2. Type /       → expect 3 commands"
  echo ""
else
  echo "❌ Fix the above before continuing."
fi
exit "$fail"
