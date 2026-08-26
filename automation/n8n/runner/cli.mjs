import { loadConfig } from './config.mjs';
import { validateRunId } from './lib.mjs';
import { StateStore } from './state-store.mjs';

const config = loadConfig();
const store = new StateStore(config);
await store.initialize();
const [command, runId, confirmFlag, confirmation] = process.argv.slice(2);

if (command === 'status') {
  const runs = await store.listRuns();
  if (!runs.length) process.stdout.write('No retained runs.\n');
  for (const run of runs) {
    process.stdout.write(`${run.id}  ${run.mode.padEnd(4)}  ${run.taskNumber}  ${run.status.padEnd(12)}  ${run.currentPhase}  ${run.repoPath ?? '-'}\n`);
  }
} else if (command === 'cleanup') {
  validateRunId(runId);
  const confirm = confirmFlag === '--confirm' && confirmation === runId;
  const result = await store.cleanupRun(runId, { confirm });
  if (!confirm) {
    process.stdout.write(`Dry run. The retained run would move from:\n${result.source}\nTo:\n${result.destination}\nRepeat with: npm run cleanup -- ${runId} --confirm ${runId}\n`);
  } else {
    process.stdout.write(`Moved run ${runId} to recoverable trash:\n${result.destination}\n`);
  }
} else {
  process.stderr.write('Use: npm run status\nOr: npm run cleanup -- <run-id> [--confirm <run-id>]\n');
  process.exitCode = 2;
}
