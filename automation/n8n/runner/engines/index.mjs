import claude from './claude.mjs';
import codex from './codex.mjs';

export const ENGINES = { codex, claude };

export function resolveEngine(id = 'codex') {
  const engine = ENGINES[id];
  if (!engine) throw new Error(`PAYFLOW_ENGINE must be one of: ${Object.keys(ENGINES).join(', ')}`);
  return engine;
}
