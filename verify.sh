#!/usr/bin/env bash
# The green gate.
#
# Environment → tests → start the app → health → smoke test.
# The database is a devcontainer service and is always running, so this script
# never starts or stops a container.
set -uo pipefail

fail=0
step() { printf '▸ %-28s' "$1"; }
ok()   { echo "✅"; }
bad()  { echo "❌  $1"; fail=1; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
# Port 8080 belongs to whatever the participant is running. This script uses its
# own so verifying never kills their app, and their app never fails this script.
APP_PORT="${APP_PORT:-8081}"

APP_PID=""
BUILD_LOG="$(mktemp)"
APP_LOG="$(mktemp)"

cleanup() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null
    wait "$APP_PID" 2>/dev/null
  fi
  rm -f "$BUILD_LOG" "$APP_LOG"
}
trap cleanup EXIT

echo ""
echo "Environment"
echo "────────────────────────────────────────────"

step "Java 21"
if java -version 2>&1 | grep -q '"21'; then ok
else bad "Java 21 not active — found: $(java -version 2>&1 | head -1)"; fi

step "Maven wrapper"
if [ -x "$ROOT/api/mvnw" ]; then ok; else bad "api/mvnw is missing or not executable"; fi

step "Node 20+"
v=$(node --version 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -n "${v:-}" ] && [ "$v" -ge 20 ] 2>/dev/null; then ok
else bad "Node 20+ not found (got ${v:-none})"; fi

step "MySQL reachable"
if (echo > /dev/tcp/"$DB_HOST"/"$DB_PORT") 2>/dev/null; then ok
else bad "nothing listening on $DB_HOST:$DB_PORT — is the db service healthy?"; fi

step "Copilot instructions"
if [ -f "$ROOT/.github/copilot-instructions.md" ]; then ok; else bad "missing .github/copilot-instructions.md"; fi

step "Agents"
n=$(ls -1 "$ROOT"/.github/agents/*.agent.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${n:-0}" -ge 4 ]; then ok; else bad "expected 4 in .github/agents, found ${n:-0}"; fi

if [ "$fail" != "0" ]; then
  echo "────────────────────────────────────────────"
  echo "❌ The environment is not ready. Fix the above before running the app."
  exit 1
fi

echo ""
echo "Build and test"
echo "────────────────────────────────────────────"

step "Unit and slice tests"
if ( cd "$ROOT/api" && ./mvnw -q -B package ) > "$BUILD_LOG" 2>&1; then
  ok
else
  bad "the build failed — run ./mvnw test in api/ to see which test broke"
  echo ""
  echo "  last 25 lines of the build:"
  tail -25 "$BUILD_LOG" | sed 's/^/    /'
  echo "────────────────────────────────────────────"
  exit 1
fi

echo ""
echo "Running application"
echo "────────────────────────────────────────────"

step "Application starts"
SERVER_PORT="$APP_PORT" java -jar "$ROOT/api/target/capstone.jar" > "$APP_LOG" 2>&1 &
APP_PID=$!

health_ok=0
for _ in $(seq 1 60); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    break
  fi
  if curl -sf "http://127.0.0.1:$APP_PORT/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
    health_ok=1
    break
  fi
  sleep 1
done

if [ "$health_ok" = "1" ]; then
  ok
else
  if kill -0 "$APP_PID" 2>/dev/null; then
    bad "the app did not report healthy within 60 seconds on port $APP_PORT"
  else
    bad "the app exited during startup — most often the database or a migration"
  fi
  echo ""
  echo "  last 25 lines of the application log:"
  tail -25 "$APP_LOG" | sed 's/^/    /'
  echo "────────────────────────────────────────────"
  exit 1
fi

step "GET /api/customers"
body="$(curl -s -o /tmp/verify-body.$$ -w '%{http_code}' "http://127.0.0.1:$APP_PORT/api/customers" 2>/dev/null)"
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
  echo "   1. Open Chat → agent picker → expect 4 agents"
  echo "   2. Type / in Chat        → expect 2 slash commands"
  echo ""
else
  echo "❌ Fix the above before continuing."
fi
exit "$fail"
