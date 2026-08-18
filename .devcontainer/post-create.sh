#!/usr/bin/env bash
# Runs once when the Codespace is created, AFTER the editor has unblocked.
# Nothing here is on the critical path, so the only thing that matters is
# finishing quickly and never leaving a broken Codespace behind.
#
# Never fail the container build. A broken post-create should leave you with a
# usable Codespace and a clear message, not a dead one.
set -uo pipefail

API_LOG="$(mktemp)"
WEB_LOG="$(mktemp)"

echo "▸ Toolchain"
echo "    java $(java -version 2>&1 | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo '?')"
echo "    node $(node --version 2>/dev/null || echo '?')"

# Maven and npm are independent and there are 4 CPUs. Run them together.
#
# `package` rather than `dependency:go-offline`: it resolves exactly the
# compile, test and plugin dependencies this project actually uses instead of
# every plugin's transitive closure, and it leaves api/target/capstone.jar
# built — so the first ./verify.sh doesn't pay for a cold build. None of the
# three existing tests need the database.
echo "▸ Warming Maven and npm in parallel…"

api_pid=""
web_pid=""
[ -f api/pom.xml ]     && { ( cd api && ./mvnw -B -q package ) > "$API_LOG" 2>&1 & api_pid=$!; }
# ci || install: an agent adding a dependency in a later task desyncs the
# lockfile, and `npm ci` hard-fails on that. Keep the fallback.
[ -f web/package.json ] && { ( cd web && (npm ci --no-audit --no-fund --prefer-offline || npm install --no-audit --no-fund) ) > "$WEB_LOG" 2>&1 & web_pid=$!; }

api_rc=0
web_rc=0
[ -n "$api_pid" ] && { wait "$api_pid"; api_rc=$?; }
[ -n "$web_pid" ] && { wait "$web_pid"; web_rc=$?; }

if [ "$api_rc" = "0" ]; then
  echo "    ✅ api  — dependencies cached, capstone.jar built"
else
  echo "    ⚠ api  — warm-up failed; ./verify.sh will rebuild from cold"
  tail -15 "$API_LOG" | sed 's/^/      /'
fi

if [ "$web_rc" = "0" ]; then
  echo "    ✅ web  — node_modules installed"
else
  echo "    ⚠ web  — install failed; run 'cd web && npm install' yourself"
  tail -15 "$WEB_LOG" | sed 's/^/      /'
fi

rm -f "$API_LOG" "$WEB_LOG"

echo ""
echo "✅ Codespace ready — run ./verify.sh"
