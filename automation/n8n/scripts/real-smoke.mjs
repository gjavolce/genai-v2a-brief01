import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../runner/config.mjs';
import { gitSnapshot } from '../runner/lib.mjs';

const config = loadConfig();
const runnerUrl = `http://127.0.0.1:${config.port}`;
const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
let run;

try {
  const health = await request('GET', '/health');
  if (!health.realReady) throw new Error(`Real runner is not ready on engine ${health.engine}: ${JSON.stringify(health.checks)}`);
  run = await request('POST', '/v1/runs', { taskNumber: '01', mode: 'real', baseRef: 'origin/main' });
  const before = await gitSnapshot(run.repoPath);
  await runAction('branch', { decision: 'use-current' });
  const job = await runAction('spec-check', {});
  const after = await gitSnapshot(run.repoPath);
  if (before.head !== after.head || before.digest !== after.digest) throw new Error('Read-only smoke changed the clone');
  const jsonlPath = join(config.runsDir, run.id, 'jobs', `${job.id}.jsonl`);
  const lines = (await readFile(jsonlPath, 'utf8')).split('\n').filter(Boolean);
  const threadId = lines.map((line) => config.engine.parseEvent(line)).find((event) => event.sessionId)?.sessionId;
  const refreshed = await request('GET', `/v1/runs/${run.id}`);
  if (!threadId || threadId !== job.threadId || refreshed.sessions['spec-check'] !== threadId) {
    throw new Error('the engine session ID was not captured exactly');
  }
  // A summarized or unparsed report would blank gate 4. Assert the evidence, not just the exit code.
  if (!['GO', 'NO-GO'].includes(job.evidence.verdict)) {
    throw new Error(`the spec-check verdict did not parse: ${JSON.stringify(job.evidence.verdict)}`);
  }
  if (!job.evidence.criterionIds.length) {
    throw new Error('the spec-check report carried no criterion IDs; the coverage table was lost');
  }
  if (job.evidence.verdict === 'NO-GO' && !job.evidence.reasons.length && !job.evidence.gapLines.length) {
    throw new Error('a NO-GO recorded no gaps, so a revision would have nothing to act on');
  }
  process.stdout.write(`Real smoke passed on engine ${config.engine.id}.\nVerdict: ${job.evidence.verdict} (${job.evidence.criterionIds.length} criteria, ${job.evidence.reasons.length} gaps)\nRun: ${run.id}\nClone: ${run.repoPath}\nJob: ${job.id}\nSession: ${threadId}\nJSONL: ${jsonlPath}\n`);
} finally {
  if (run?.id) await request('POST', `/v1/runs/${run.id}/stop`, { reason: 'Task 01 read-only smoke completed' }).catch(() => {});
}

async function runAction(action, payload) {
  const job = await request('POST', `/v1/runs/${run.id}/actions`, {
    action,
    requestId: `real-smoke:${config.engine.id}:${action}:${Date.now()}`,
    payload,
  });
  for (;;) {
    const current = await request('GET', `/v1/jobs/${job.id}`);
    if (!['queued', 'running'].includes(current.status)) {
      if (current.status !== 'succeeded') throw new Error(`${action} failed: ${current.error}`);
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function request(method, path, body) {
  const response = await fetch(`${runnerUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${value.error ?? response.status}`);
  return value;
}
