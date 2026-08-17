#!/usr/bin/env bash
# Runs once when the Codespace is created. Prebuilds run it in advance, so
# anything slow here is paid for once by the prebuild rather than fifteen
# times at 09:05.
#
# Never fail the container build. A broken post-create should leave you with a
# usable Codespace and a clear message, not a dead one.
set -uo pipefail

echo "▸ Toolchain"
echo "    java $(java -version 2>&1 | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo '?')"
echo "    mvn  $(mvn -v 2>/dev/null | head -1 | awk '{print $3}' || echo '?')"
echo "    node $(node --version 2>/dev/null || echo '?')"

echo "▸ Waiting for MySQL…"
for i in $(seq 1 40); do
  if (echo > /dev/tcp/db/3306) 2>/dev/null; then
    echo "    up"
    break
  fi
  sleep 2
  [ "$i" = "40" ] && echo "    ⚠ not reachable — check the db service in docker-compose.yml"
done

if [ -f api/pom.xml ]; then
  echo "▸ Warming Maven dependencies…"
  ( cd api && mvn -q -B dependency:go-offline ) || echo "    ⚠ skipped"
fi

if [ -f web/package.json ]; then
  echo "▸ Installing web dependencies…"
  ( cd web && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) ) || echo "    ⚠ skipped"
fi

chmod +x verify.sh 2>/dev/null || true

echo ""
echo "✅ Codespace ready — run ./verify.sh"
