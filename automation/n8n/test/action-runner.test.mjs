import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ActionRunner } from '../runner/action-runner.mjs';
import codex from '../runner/engines/codex.mjs';
import { StateStore } from '../runner/state-store.mjs';

const fixturePath = new URL('../fixtures/demo-scenarios.json', import.meta.url).pathname;

async function setup(scenario = 'happy-path') {
  const runsDir = await mkdtemp(join(tmpdir(), 'payflow-action-'));
  const store = new StateStore({ runsDir, remoteUrl: 'unused' });
  await store.initialize();
  const run = await store.createRun({ taskNumber: '04', mode: 'demo', demoScenario: scenario });
  const runner = new ActionRunner({ store, engine: codex, engineBin: 'unused', model: 'gpt-5.6-sol', fixturePath });
  return { run, store, runner };
}

async function execute(store, runner, runId, action, payload = {}, requestId = `${action}-request`) {
  const job = { id: crypto.randomUUID(), runId, action, status: 'queued', requestId, createdAt: new Date().toISOString() };
  await store.saveJob(job);
  await runner.execute(job, payload);
  return await store.getJob(runId, job.id);
}

test('demo plan captures and preserves the planner session ID', async () => {
  const { run, store, runner } = await setup('happy-path');
  const job = await execute(store, runner, run.id, 'plan');
  assert.equal(job.status, 'succeeded');
  const updated = await store.getRun(run.id);
  assert.equal(updated.sessions.planner, `demo-${run.id}`);
  assert.equal(updated.planTaskCount, 3);
});

test('planner clarification resumes to the deterministic completed plan', async () => {
  const { run, store, runner } = await setup('planner-question');
  const first = await execute(store, runner, run.id, 'plan', {}, 'plan-first');
  assert.equal(first.evidence.needsInput, true);
  const second = await execute(store, runner, run.id, 'plan', { answer: 'Return the original result.' }, 'plan-answer');
  assert.equal(second.evidence.needsInput, undefined);
  assert.equal(second.evidence.taskCount, 3);
});

test('two identical failures block the run without a third retry', async () => {
  const { run, store, runner } = await setup('repeated-failure');
  const first = await execute(store, runner, run.id, 'acceptance', {}, 'failure-one');
  assert.equal(first.status, 'failed');
  const second = await execute(store, runner, run.id, 'acceptance', {}, 'failure-two');
  assert.equal(second.status, 'blocked');
  assert.equal((await store.getRun(run.id)).status, 'blocked');
});

test('production defect becomes green only after the explicit fix action', async () => {
  const { run, store, runner } = await setup('production-defect');
  const failed = await execute(store, runner, run.id, 'verify', {}, 'verify-defect');
  assert.equal(failed.evidence.productionDefect, true);
  await store.recordGate(run.id, 6, { decision: 'return-production-defect', details: { productionDefect: 'Wrong balance.' } });
  await execute(store, runner, run.id, 'fix-defect', {}, 'fix-defect');
  const green = await execute(store, runner, run.id, 'verify', {}, 'verify-green');
  assert.equal(green.evidence.verifyLine, '✅ All green.');
});

test('demo final audit requires every gate', async () => {
  const { run, store, runner } = await setup();
  let blocked = await execute(store, runner, run.id, 'final-audit');
  assert.equal(blocked.evidence.passed, false);
  assert.equal((await store.getRun(run.id)).status, 'blocked');

  const second = await setup();
  const decisions = ['accept', 'accept', 'approve', 'accept-go', 'continue', 'accept-green', 'none'];
  for (let gate = 1; gate <= 7; gate += 1) await second.store.recordGate(second.run.id, gate, { decision: decisions[gate - 1], details: {} });
  const passed = await execute(second.store, second.runner, second.run.id, 'final-audit');
  assert.equal(passed.evidence.passed, true);
  assert.equal((await second.store.getRun(second.run.id)).status, 'completed');
});

test('traverses all seven gates and ten actions in demo mode', async () => {
  const { run, store, runner } = await setup('selected-findings');
  await execute(store, runner, run.id, 'branch', { decision: 'create-task-branch' }, 'full-branch');
  await execute(store, runner, run.id, 'acceptance', {}, 'full-acceptance');
  await store.recordGate(run.id, 1, { decision: 'accept', details: {} });
  await execute(store, runner, run.id, 'adr', {}, 'full-adr');
  await store.recordGate(run.id, 2, { decision: 'accept', details: {} });
  await execute(store, runner, run.id, 'kickoff', {}, 'full-kickoff');
  await execute(store, runner, run.id, 'plan', {}, 'full-plan');
  await store.recordGate(run.id, 3, { decision: 'approve', details: {} });
  await execute(store, runner, run.id, 'spec-check', {}, 'full-spec');
  await store.recordGate(run.id, 4, { decision: 'accept-go', details: {} });
  for (let task = 1; task <= 3; task += 1) {
    await execute(store, runner, run.id, 'build-task', { task, taskCount: 3 }, `full-build-${task}`);
    await store.recordGate(run.id, 5, { decision: 'continue', details: { task } });
  }
  await execute(store, runner, run.id, 'verify', {}, 'full-verify');
  await store.recordGate(run.id, 6, { decision: 'accept-green', details: {} });
  const review = await execute(store, runner, run.id, 'review', {}, 'full-review');
  assert.equal(review.evidence.securityReviewer, 'missing');
  const findingId = review.evidence.findings[0].id;
  await store.recordGate(run.id, 7, { decision: 'individual-ids', details: { selectedFindingIds: [findingId], continueWithoutSecurity: true } });
  await execute(store, runner, run.id, 'fix-findings', { selectedFindingIds: [findingId] }, 'full-fix');
  await execute(store, runner, run.id, 'verify', {}, 'full-reverify');
  await execute(store, runner, run.id, 'close', {}, 'full-close');
  const audit = await execute(store, runner, run.id, 'final-audit', {}, 'full-audit');
  assert.equal(audit.evidence.passed, true);
  const completed = await store.getRun(run.id);
  assert.equal(completed.securityReviewer, 'missing');
  assert.equal(completed.securityReviewAcknowledged, true);
  assert.equal(completed.status, 'completed');
});

test('a demo stop at preflight routes like a real stop instead of failing the job', async () => {
  const { run, store, runner } = await setup();

  const job = await execute(store, runner, run.id, 'branch', { decision: 'stop' }, 'branch-stop');

  assert.equal(job.status, 'succeeded');
  assert.equal(job.evidence.decision, 'stop');
  assert.equal((await store.getRun(run.id)).status, 'stopped');
});

test('a coverage NO-GO records the gaps and the revision converges', async () => {
  const { run, store, runner } = await setup('no-go-revision');

  const first = await execute(store, runner, run.id, 'spec-check', {}, 'spec-one');
  assert.equal(first.evidence.verdict, 'NO-GO');
  const recorded = await store.getRun(run.id);
  assert.deepEqual(recorded.coverage.uncoveredCriteria, ['AC-04-1.2']);
  assert.deepEqual(recorded.coverage.gapLines, ['| AC-04-1.2 | — | \u274c GAP |']);

  await store.recordGate(run.id, 4, { decision: 'revise-plan', details: { revisionNote: 'Cover AC-04-1.2 in task 2.' } });
  const prompt = runner.promptFor(await store.getRun(run.id), 'plan', { coverageRevision: true, revisionNote: 'Cover AC-04-1.2 in task 2.' });
  assert.match(prompt, /AC-04-1\.2/);
  assert.match(prompt, /Cover AC-04-1\.2 in task 2\./);

  await execute(store, runner, run.id, 'plan', { coverageRevision: true }, 'plan-revised');
  const second = await execute(store, runner, run.id, 'spec-check', {}, 'spec-two');
  assert.equal(second.evidence.verdict, 'GO');
});

test('verification meaning is not recorded when the demo run never reaches green', async () => {
  const { run, store, runner } = await setup('production-defect');

  await execute(store, runner, run.id, 'verify', {}, 'verify-red');
  assert.equal((await store.getRun(run.id)).verificationMeaningRecorded, false);

  await store.recordGate(run.id, 6, { decision: 'return-production-defect', details: { productionDefect: 'Off by a penny.' } });
  await execute(store, runner, run.id, 'fix-defect', {}, 'fix');
  await execute(store, runner, run.id, 'verify', {}, 'verify-green');
  assert.equal((await store.getRun(run.id)).verificationMeaningRecorded, true);
});

test('gate 7 accepts the canonical include-low decision', async () => {
  const { run, store } = await setup();

  const gated = await store.recordGate(run.id, 7, { decision: 'include-low', details: { selectedFindingIds: ['CR-1'] } });

  assert.equal(gated.gates['7'].decision, 'include-low');
});
