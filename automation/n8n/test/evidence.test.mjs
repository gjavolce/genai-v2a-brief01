import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ActionRunner } from '../runner/action-runner.mjs';
import codex from '../runner/engines/codex.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const runner = new ActionRunner({ store: null, engine: codex, engineBin: 'unused', model: 'm', fixturePath: 'unused' });
const run = { taskNumber: '04', repoPath: repoRoot, gates: {}, findings: [], sessions: {} };

function snapshot(overrides = {}) {
  return { head: 'aaa', branch: 'feature/04-x', status: [], digest: 'd0', ...overrides };
}

test('a commit inside any action is an ownership violation', () => {
  const violations = runner.ownershipViolations(run, 'acceptance', snapshot(), snapshot({ head: 'bbb' }), 'p0', 'p0');

  assert.deepEqual(violations, ['acceptance created a commit; HEAD changed']);
});

test('a read-only role may not change the working tree', () => {
  const changed = runner.ownershipViolations(run, 'spec-check', snapshot(), snapshot({ digest: 'd1' }), 'p0', 'p0');
  const untouched = runner.ownershipViolations(run, 'spec-check', snapshot(), snapshot(), 'p0', 'p0');

  assert.deepEqual(changed, ['spec-check changed the working tree but is read-only']);
  assert.deepEqual(untouched, []);
});

test('the test verifier may not change production code', () => {
  const wrote = runner.ownershipViolations(run, 'verify', snapshot(), snapshot(), 'p0', 'p1');
  const testsOnly = runner.ownershipViolations(run, 'verify', snapshot(), snapshot(), 'p0', 'p0');

  assert.deepEqual(wrote, ['test-verifier changed production code']);
  assert.deepEqual(testsOnly, []);
});

test('an authoring action may write only its own artifact', () => {
  const before = snapshot();
  const allowed = snapshot({ status: ['?? docs/features/04/04-acceptance.md'] });
  const stray = snapshot({ status: ['?? docs/features/04/04-acceptance.md', ' M api/src/main/java/Bad.java'] });

  assert.deepEqual(runner.ownershipViolations(run, 'acceptance', before, allowed, 'p0', 'p0'), []);
  assert.deepEqual(
    runner.ownershipViolations(run, 'acceptance', before, stray, 'p0', 'p0'),
    ['acceptance changed disallowed path api/src/main/java/Bad.java'],
  );
});

test('closeout may write the PR document and the acceptance evidence, and nothing else', () => {
  const before = snapshot();
  const both = snapshot({ status: ['?? docs/features/04/04-PR.md', ' M docs/features/04/04-acceptance.md'] });
  const extra = snapshot({ status: ['?? docs/features/04/04-plan.md'] });

  assert.deepEqual(runner.ownershipViolations(run, 'close', before, both, 'p0', 'p0'), []);
  assert.deepEqual(
    runner.ownershipViolations(run, 'close', before, extra, 'p0', 'p0'),
    ['close changed disallowed path docs/features/04/04-plan.md'],
  );
});

test('the build actions carry no path allowlist', () => {
  const wrote = snapshot({ status: [' M api/src/main/java/Any.java', '?? web/src/any.ts'] });

  assert.deepEqual(runner.ownershipViolations(run, 'build-task', snapshot(), wrote, 'p0', 'p1'), []);
});

test('verification meaning is recorded only when verify.sh actually ran', async () => {
  const ran = await runner.normalizeEvidence(run, 'verify', 'output', ['./verify.sh'], {});
  const skipped = await runner.normalizeEvidence(run, 'verify', 'output', ['echo hello'], {});

  assert.equal(ran.verificationMeaningRecorded, true);
  assert.match(ran.verificationMeaning, /GET \/api\/customers/);
  assert.match(ran.verificationMeaning, /does not mean that the test suites passed/);
  assert.equal(skipped.verificationMeaningRecorded, false);
  assert.match(skipped.verificationMeaning, /did not run/);
});

test('verification meaning reports which suites the job observed', async () => {
  const both = await runner.normalizeEvidence(run, 'verify', 'output', ['(cd api && ./mvnw test)', '(cd web && npm test)', './verify.sh'], {});
  const partial = await runner.normalizeEvidence(run, 'verify', 'output', ['(cd api && ./mvnw test)', './verify.sh'], {});

  assert.equal(both.suitesExecuted, true);
  assert.match(both.verificationMeaning, /the API suite ran and the web suite ran/);
  assert.equal(partial.suitesExecuted, false);
  assert.match(partial.verificationMeaning, /the API suite ran and the web suite did not run/);
});

test('only criteria on a gap line count as uncovered', async () => {
  const message = [
    '| Criterion | Covered by | Status |',
    '| AC-04-1.1 | Task 2 | covered |',
    '| AC-04-1.2 | — | GAP |',
    '| AC-04-2.1 | Task 3 | covered |',
    '**NO-GO**',
  ].join('\n');

  const evidence = await runner.normalizeEvidence(run, 'spec-check', message, [], {});

  assert.equal(evidence.verdict, 'NO-GO');
  assert.deepEqual(evidence.uncoveredCriteria, ['AC-04-1.2']);
});

test('a GO verdict reports no uncovered criteria', async () => {
  const message = '| AC-04-1.1 | Task 2 | covered |\n**GO**';

  const evidence = await runner.normalizeEvidence(run, 'spec-check', message, [], {});

  assert.deepEqual(evidence.uncoveredCriteria, []);
});
