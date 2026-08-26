import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  InputError,
  bearerMatches,
  containedPath,
  countPlanTasks,
  parseFindings,
  parseThreadEvent,
  validateAction,
  validateBaseRef,
  validateFindingIds,
  validateTaskIndex,
  validateTaskNumber,
  writeJsonAtomic,
} from '../runner/lib.mjs';

test('validates task numbers, refs, action names, task indexes, and finding IDs', () => {
  assert.equal(validateTaskNumber('01'), '01');
  assert.throws(() => validateTaskNumber('1'), InputError);
  for (const ref of ['origin/main', 'feature/01-safe', 'refs/tags/v1.2.3']) assert.equal(validateBaseRef(ref), ref);
  for (const ref of ['/main', 'main/', 'a//b', 'a..b', 'x@{y', 'main.lock', '-bad', 'bad ref']) assert.throws(() => validateBaseRef(ref), InputError);
  assert.equal(validateAction('spec-check'), 'spec-check');
  assert.throws(() => validateAction('shell'), InputError);
  assert.equal(validateTaskIndex('3'), 3);
  assert.throws(() => validateTaskIndex(0), InputError);
  assert.deepEqual(validateFindingIds(['CR-1', 'SR-12']), ['CR-1', 'SR-12']);
  assert.throws(() => validateFindingIds(['../../etc/passwd']), InputError);
});

test('contains paths within the configured run directory', () => {
  assert.equal(containedPath('/tmp/payflow-runs', 'one', 'state.json'), '/tmp/payflow-runs/one/state.json');
  assert.throws(() => containedPath('/tmp/payflow-runs', '..', 'escape'), InputError);
});

test('compares bearer tokens without accepting malformed headers', () => {
  assert.equal(bearerMatches('Bearer abcdef', 'abcdef'), true);
  assert.equal(bearerMatches('bearer abcdef', 'abcdef'), false);
  assert.equal(bearerMatches('Bearer abcdeg', 'abcdef'), false);
  assert.equal(bearerMatches(undefined, 'abcdef'), false);
});

test('parses Codex session IDs and only flags executed commands', () => {
  assert.equal(parseThreadEvent('{"type":"thread.started","thread_id":"thread-123"}').threadId, 'thread-123');
  const suggestion = parseThreadEvent('{"type":"item.completed","item":{"type":"agent_message","text":"Suggested: git push"}}');
  assert.equal(suggestion.forbidden, null);
  const command = parseThreadEvent('{"type":"item.completed","item":{"type":"command_execution","command":"git commit -m bad"}}');
  assert.equal(command.forbidden, 'git commit -m bad');
});

test('normalizes findings and plan task counts', () => {
  const message = '| Severity | File:line | Finding | Remediation |\n|---|---|---|---|\n| HIGH | api/A.java:4 | Broken | Fix it |\n| LOW | web/a.ts:2 | Style | Rename |';
  assert.deepEqual(parseFindings(message, 'code').map(({ id, severity }) => ({ id, severity })), [{ id: 'CR-1', severity: 'HIGH' }, { id: 'CR-2', severity: 'LOW' }]);
  assert.equal(countPlanTasks('1. First\n2) Second\n- note'), 2);
});

test('writes JSON state atomically without leaving temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'payflow-atomic-'));
  const path = join(directory, 'state.json');
  await writeJsonAtomic(path, { version: 1 });
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { version: 1 });
  assert.deepEqual(await readdir(directory), ['state.json']);
});
