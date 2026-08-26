import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ActionRunner } from '../runner/action-runner.mjs';
import claude from '../runner/engines/claude.mjs';
import codex from '../runner/engines/codex.mjs';
import { InputError, describeVerifyScript, parseStreamJsonEvent, planTaskLines } from '../runner/lib.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function runner(engine) {
  return new ActionRunner({ store: null, engine, engineBin: 'unused', model: 'test-model', fixturePath: 'unused' });
}

function run(overrides = {}) {
  return { taskNumber: '04', repoPath: repoRoot, gates: {}, findings: [], sessions: {}, coverage: null, ...overrides };
}

test('renders every skill invocation in the syntax of its engine', () => {
  const cases = [['acceptance', 'business-analyst'], ['adr', 'architect'], ['kickoff', 'feature-kickoff']];

  for (const [action, skill] of cases) {
    assert.equal(runner(codex).promptFor(run(), action, {}), `$${skill} 04`);
    assert.equal(runner(claude).promptFor(run(), action, {}), `/${skill} 04`);
  }
});

test('carries a gate revision note into the authoring prompt', () => {
  const note = 'AC-04-1.2 is not observable. Name the HTTP status.';

  const revised = runner(codex).promptFor(run(), 'acceptance', { revisionNote: note });

  assert.match(revised, /human rejected the previous acceptance criteria/);
  assert.match(revised, /Name the HTTP status\./);
  assert.match(revised, /\$business-analyst 04$/);
});

test('an absent or blank revision note leaves the prompt untouched', () => {
  const plain = runner(codex).promptFor(run(), 'adr', {});
  const blank = runner(codex).promptFor(run(), 'adr', { revisionNote: '   ' });

  assert.equal(plain, '$architect 04');
  assert.equal(blank, '$architect 04');
});

test('the coverage revision prompt quotes the recorded gaps and forbids code', () => {
  const withCoverage = run({ coverage: { verdict: 'NO-GO', uncoveredCriteria: ['AC-04-1.2'], gapLines: ['| AC-04-1.2 | — | GAP |'] } });

  const prompt = runner(claude).promptFor(withCoverage, 'plan', { coverageRevision: true, revisionNote: 'Split task 2.' });

  assert.match(prompt, /Uncovered criteria: AC-04-1\.2/);
  assert.match(prompt, /\| AC-04-1\.2 \| — \| GAP \|/);
  assert.match(prompt, /Split task 2\./);
  assert.match(prompt, /Do not write code/);
  assert.match(prompt, /\/feature-plan 04/);
});

test('a coverage revision without recorded gaps is refused rather than replanned blindly', () => {
  assert.throws(() => runner(codex).promptFor(run(), 'plan', { coverageRevision: true }), InputError);
});

test('plan intents do not collide, and each engine names its own planner', () => {
  const sharpen = runner(codex).promptFor(run(), 'plan', { sharpenTask: 2 });
  assert.match(sharpen, /^Task 2 is too vague/);

  const answered = runner(codex).promptFor(run(), 'plan', { answer: 'Refuse the repeat.' });
  assert.match(answered, /Use this human answer: Refuse the repeat\./);

  assert.match(runner(codex).promptFor(run(), 'plan', {}), /Use the project planner agent with exactly/);
  assert.match(runner(claude).promptFor(run(), 'plan', {}), /Use the Plan subagent with exactly/);
});

test('a defect fix falls back to gate 6 evidence and refuses an empty gate', () => {
  const typed = run({ gates: { 6: { details: { productionDefect: 'Balance is off by a penny.' } } } });
  assert.match(runner(codex).promptFor(typed, 'fix-defect', {}), /Balance is off by a penny\./);

  const blank = run({ gates: { 6: { details: { productionDefect: '   ', evidenceRaw: '{"verifyLine":"Fix the above"}' } } } });
  assert.match(runner(codex).promptFor(blank, 'fix-defect', {}), /verifyLine/);

  const empty = run({ gates: { 6: { details: {} } } });
  assert.throws(() => runner(codex).promptFor(empty, 'fix-defect', {}), InputError);
});

test('only findings recorded on the run may be selected for a fix', () => {
  const reviewed = run({ findings: [{ id: 'CR-1', severity: 'HIGH', fileLine: 'A.java:1', finding: 'Bad', remediation: 'Fix' }] });

  assert.match(runner(codex).promptFor(reviewed, 'fix-findings', { selectedFindingIds: ['CR-1'] }), /CR-1 HIGH A\.java:1/);
  assert.throws(() => runner(codex).promptFor(reviewed, 'fix-findings', { selectedFindingIds: ['CR-2'] }), InputError);
});

test('build-remaining refuses an empty task range', () => {
  assert.throws(() => runner(codex).promptFor(run(), 'build-remaining', { fromTask: 2, toTask: 1 }), InputError);
  assert.match(runner(codex).promptFor(run(), 'build-remaining', { fromTask: 2, toTask: 4 }), /build tasks 2 through 4/);
});

test('each engine builds arguments its own CLI accepts', () => {
  const shared = { prompt: 'do it', repoPath: '/runs/repo', model: 'm', lastMessagePath: '/runs/last.md' };

  const codexRead = codex.buildArgs({ ...shared, sessionId: null, readOnly: true });
  assert.deepEqual(codexRead.slice(0, 6), ['exec', '--json', '--model', 'm', '--sandbox', 'read-only']);
  const codexResume = codex.buildArgs({ ...shared, sessionId: 'thread-1', readOnly: false });
  assert.deepEqual(codexResume.slice(0, 2), ['exec', 'resume']);
  assert(codexResume.includes('thread-1'));

  const claudeWrite = claude.buildArgs({ ...shared, sessionId: null, readOnly: false, environment: {} });
  assert.deepEqual(claudeWrite.slice(0, 6), ['-p', 'do it', '--output-format', 'stream-json', '--verbose', '--model']);
  const claudeRead = claude.buildArgs({ ...shared, sessionId: 'sess-1', readOnly: true, environment: {} });
  assert(claudeRead.includes('--resume') && claudeRead.includes('sess-1'));
  assert(claudeRead.includes('--disallowed-tools') && claudeRead.includes('Write'));
  assert(!claudeWrite.includes('--disallowed-tools'));
});

test('the stream-json parser finds the session, executed commands, and final message', () => {
  assert.equal(parseStreamJsonEvent('{"type":"system","subtype":"init","session_id":"sess-9"}').sessionId, 'sess-9');

  const tools = parseStreamJsonEvent(JSON.stringify({
    type: 'assistant',
    message: { content: [
      { type: 'text', text: 'running' },
      { type: 'tool_use', name: 'Bash', input: { command: 'git commit -m bad' } },
      { type: 'tool_use', name: 'Read', input: { file_path: '/a' } },
    ] },
  }));
  assert.deepEqual(tools.commands, ['git commit -m bad']);

  const result = parseStreamJsonEvent('{"type":"result","subtype":"success","session_id":"sess-9","result":"done"}');
  assert.equal(result.finalMessage, 'done');
  assert.deepEqual(parseStreamJsonEvent('not json').commands, []);
});

test('plan task counting reads only the implementation task section', () => {
  const plan = [
    '## Summary', '1. Not a task', '',
    '## Implementation Tasks', '1. First task', '2. Second task', '',
    '## Assumptions', '1. Not a task either',
  ].join('\n');

  assert.deepEqual(planTaskLines(plan), ['1. First task', '2. Second task']);
});

test('the verification meaning is read from the real verify.sh', async () => {
  const described = await describeVerifyScript(repoRoot);

  assert(described.steps.includes('GET /api/customers'));
  assert(described.steps.includes('docker compose up'));
  assert.equal(described.runsSuites, false);
  assert.equal(await describeVerifyScript('/nonexistent-path'), null);
});

test('every reporting action asks for its table verbatim', () => {
  // A Claude main agent summarizes its subagent by default. A summary drops the tables that
  // gate 4 and gate 7 must show and that parseFindings reads.
  for (const engine of [codex, claude]) {
    for (const action of ['spec-check', 'verify', 'review', 'security-review']) {
      const prompt = runner(engine).promptFor(run(), action, {});

      assert.match(prompt, /verbatim, exactly as the subagent wrote them/, `${engine.id}/${action}`);
      assert.match(prompt, /Do not summarize them/, `${engine.id}/${action}`);
    }
  }

  assert.match(runner(codex).promptFor(run(), 'spec-check', {}), /coverage table, the numbered gap list, and the verdict/);
  assert.match(runner(codex).promptFor(run(), 'review', {}), /severity, file:line, finding, and remediation/);
  assert.match(runner(codex).promptFor(run(), 'verify', {}), /criterion-to-test table and the final verify\.sh result line/);
});
