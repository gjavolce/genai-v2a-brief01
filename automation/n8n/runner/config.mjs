import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveEngine } from './engines/index.mjs';
import { requireAbsoluteDirectory } from './lib.mjs';

const automationRoot = fileURLToPath(new URL('..', import.meta.url));

export function loadConfig(environment = process.env) {
  const runsDir = requireAbsoluteDirectory(environment.PAYFLOW_RUNS_DIR, 'PAYFLOW_RUNS_DIR');
  const token = environment.PAYFLOW_RUNNER_TOKEN;
  if (!token || token.length < 24) throw new Error('PAYFLOW_RUNNER_TOKEN must contain at least 24 characters');
  const engine = resolveEngine(environment.PAYFLOW_ENGINE ?? 'codex');
  return {
    runsDir,
    remoteUrl: environment.PAYFLOW_REMOTE_URL ?? 'https://github.com/gjavolce/genai-v2a-brief01.git',
    token,
    host: environment.PAYFLOW_RUNNER_HOST ?? '127.0.0.1',
    port: Number(environment.PAYFLOW_RUNNER_PORT ?? 5680),
    engine,
    // PAYFLOW_CODEX_BIN and PAYFLOW_CODEX_MODEL stay readable so existing .env files work.
    engineBin: environment.PAYFLOW_ENGINE_BIN ?? environment.PAYFLOW_CODEX_BIN ?? engine.defaultBin,
    model: environment.PAYFLOW_ENGINE_MODEL ?? environment.PAYFLOW_CODEX_MODEL ?? engine.defaultModel,
    environment,
    fixturePath: join(automationRoot, 'fixtures', 'demo-scenarios.json'),
  };
}
