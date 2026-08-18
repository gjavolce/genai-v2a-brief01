#!/usr/bin/env bash
# Runs before the editor unblocks (see "waitFor" in devcontainer.json).
# Everything here is on the critical path, so it must stay near-instant.
# Anything slow belongs in post-create.sh.
set -uo pipefail

chmod +x verify.sh api/mvnw 2>/dev/null || true

# Report the toolchain the language server will pick up. Node and gh come
# from features on this image, so a missing one means a feature failed.
echo "  java: $(java -version 2>&1 | head -1)"
echo "  node: $(node --version 2>/dev/null || echo 'MISSING — node feature failed')"
echo "  gh:   $(gh --version 2>/dev/null | head -1 || echo 'MISSING — github-cli feature failed')"

echo ""
echo "Editor is ready. Dependency warm-up is still running in the background."
echo "Wait for '✅ Codespace ready' in the setup terminal before ./verify.sh."
echo ""
