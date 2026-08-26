import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const automationRoot = new URL('..', import.meta.url).pathname;

test('API authenticates requests and makes action submission idempotent', async (context) => {
  const port = await freePort();
  const runsDir = await mkdtemp(join(tmpdir(), 'payflow-api-'));
  const token = 'test-token-that-is-longer-than-24-characters';
  const child = spawn(process.execPath, ['runner/server.mjs'], {
    cwd: automationRoot,
    env: { ...process.env, PAYFLOW_RUNS_DIR: runsDir, PAYFLOW_RUNNER_TOKEN: token, PAYFLOW_RUNNER_PORT: String(port), PAYFLOW_CODEX_BIN: process.execPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  context.after(() => child.kill('SIGTERM'));
  await waitForServer(port, token);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/v1/runs`);
  assert.equal(unauthorized.status, 401);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const createdResponse = await fetch(`http://127.0.0.1:${port}/v1/runs`, { method: 'POST', headers, body: JSON.stringify({ taskNumber: '04', mode: 'demo' }) });
  assert.equal(createdResponse.status, 201);
  const run = await createdResponse.json();
  const request = { action: 'acceptance', requestId: 'same-request-id' };
  const first = await fetch(`http://127.0.0.1:${port}/v1/runs/${run.id}/actions`, { method: 'POST', headers, body: JSON.stringify(request) });
  assert.equal(first.status, 202);
  const firstJob = await first.json();
  await waitForJob(port, token, firstJob.id);
  const duplicate = await fetch(`http://127.0.0.1:${port}/v1/runs/${run.id}/actions`, { method: 'POST', headers, body: JSON.stringify(request) });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).id, firstJob.id);
  const jobResponse = await fetch(`http://127.0.0.1:${port}/v1/jobs/${firstJob.id}`, { headers });
  assert.equal(jobResponse.status, 200);
  assert.equal((await jobResponse.json()).status, 'succeeded');
});

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(port, token) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/runs`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('runner server did not start');
}

async function waitForJob(port, token, jobId) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${port}/v1/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
    const job = await response.json();
    if (!['queued', 'running'].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('job did not finish');
}
