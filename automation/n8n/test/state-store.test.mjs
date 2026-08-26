import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCommand } from '../runner/lib.mjs';
import { StateStore } from '../runner/state-store.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'payflow-store-'));
  const seed = join(root, 'seed');
  const remote = join(root, 'remote.git');
  const runsDir = join(root, 'retained-runs');
  await mkdir(join(seed, 'docs', 'tasks'), { recursive: true });
  await runCommand('git', ['init', '-b', 'main', seed]);
  await runCommand('git', ['-C', seed, 'config', 'user.email', 'test@example.invalid']);
  await runCommand('git', ['-C', seed, 'config', 'user.name', 'Test']);
  await writeFile(join(seed, 'docs', 'tasks', '01-demo.md'), '# Demo\n\n**Branch:** `feature/01-demo`\n\n## Note\nKeep this note.\n');
  await runCommand('git', ['-C', seed, 'add', '.']);
  await runCommand('git', ['-C', seed, 'commit', '-m', 'seed']);
  await runCommand('git', ['clone', '--bare', seed, remote]);
  const store = new StateStore({ runsDir, remoteUrl: remote });
  await store.initialize();
  return { root, seed, remote, runsDir, store };
}

test('clones a real run from main and enforces one active real run', async () => {
  const { store, runsDir } = await fixture();
  const run = await store.createRun({ taskNumber: '01', mode: 'real' });
  assert.equal(run.status, 'awaiting_branch');
  assert.equal(run.expectedBranch, 'feature/01-demo');
  assert.equal(run.taskNote, 'Keep this note.');
  assert(run.repoPath.startsWith(`${runsDir}/`));
  assert(!run.repoPath.includes('/genai-v2a-brief01/automation/'));
  assert.equal((await readFile(join(run.repoPath, 'docs', 'tasks', '01-demo.md'), 'utf8')).includes('Keep this note.'), true);
  await assert.rejects(() => store.createRun({ taskNumber: '01', mode: 'real' }), /already active/);
});

test('records only valid gate decisions and preserves artifact baselines', async () => {
  const { store } = await fixture();
  const run = await store.createRun({ taskNumber: '01', mode: 'real' });
  await assert.rejects(() => store.recordGate(run.id, 4, { decision: 'silently-ignore' }), /not valid/);
  const gated = await store.recordGate(run.id, 4, { decision: 'explicit-override', details: { reason: 'Human chose override.' } });
  assert.equal(gated.gates['4'].decision, 'explicit-override');
  assert.deepEqual(gated.artifactBaseline, { acceptance: null, adr: null, 'plan-request': null, plan: null, PR: null });
});

test('cleanup is dry-run by default and moves only a terminal run into trash', async () => {
  const { store } = await fixture();
  const run = await store.createRun({ taskNumber: '04', mode: 'demo' });
  await assert.rejects(() => store.cleanupRun(run.id), /Stop it before cleanup/);
  await store.stopRun(run.id);
  const dry = await store.cleanupRun(run.id, { now: new Date('2026-01-01T00:00:00.000Z') });
  assert.equal(dry.moved, false);
  assert.equal((await store.getRun(run.id)).id, run.id);
  const moved = await store.cleanupRun(run.id, { confirm: true, now: new Date('2026-01-01T00:00:00.000Z') });
  assert.equal(moved.moved, true);
  await assert.rejects(() => store.getRun(run.id), /ENOENT/);
  assert.equal(JSON.parse(await readFile(join(moved.destination, 'state.json'), 'utf8')).id, run.id);
});

test('rejects unknown demo scenarios', async () => {
  const { store } = await fixture();
  await assert.rejects(() => store.createRun({ taskNumber: '04', mode: 'demo', demoScenario: 'anything' }), /not supported/);
});
