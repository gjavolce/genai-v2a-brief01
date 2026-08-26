import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const ACTIONS = new Set([
  'acceptance',
  'adr',
  'kickoff',
  'plan',
  'spec-check',
  'build-task',
  'build-remaining',
  'verify',
  'review',
  'security-review',
  'fix-defect',
  'fix-findings',
  'close',
  'final-audit',
  'branch',
]);

export const READ_ONLY_ACTIONS = new Set(['spec-check', 'review', 'security-review']);
// The canonical orchestrator refuses to start when either authoring skill is absent.
export const REQUIRED_SKILLS = [
  { name: 'business-analyst', path: '.claude/skills/business-analyst/SKILL.md' },
  { name: 'architect', path: '.claude/skills/architect/SKILL.md' },
];
export const REQUIRED_ARTIFACTS = ['acceptance', 'adr', 'plan-request', 'plan', 'PR'];
export const FORBIDDEN_COMMAND = /(?:^|[;&|]\s*)(?:git\s+(?:commit|push)\b|gh\s+pr\s+create\b)/i;
const TASK_PATTERN = /^\d{2}$/;
const REF_PATTERN = /^(?![-/.])(?!.*(?:\.\.|\/\/|@\{|\.lock(?:\/|$)))(?!.*[~^:?*\[\\\s])(?:[A-Za-z0-9._/-]+)(?<![/.])$/;
const FINDING_PATTERN = /^(?:CR|SR)-\d+$/;

export function validateTaskIndex(value, name = 'task') {
  const task = Number(value);
  if (!Number.isInteger(task) || task < 1 || task > 999) throw new InputError(`${name} must be an integer between 1 and 999`);
  return task;
}

export function validateTaskNumber(value) {
  if (typeof value !== 'string' || !TASK_PATTERN.test(value)) {
    throw new InputError('taskNumber must contain exactly two digits');
  }
  return value;
}

export function validateBaseRef(value = 'origin/main') {
  if (typeof value !== 'string' || value.length > 160 || !REF_PATTERN.test(value)) {
    throw new InputError('baseRef is not a safe Git reference');
  }
  return value;
}

export function validateRunId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new InputError('runId must be a UUID');
  }
  return value;
}

export function validateAction(value) {
  if (!ACTIONS.has(value)) throw new InputError('action is not allowed');
  return value;
}

export function validateFindingIds(value) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !FINDING_PATTERN.test(id))) {
    throw new InputError('selectedFindingIds contains an invalid finding ID');
  }
  return value;
}

export function requireAbsoluteDirectory(value, name) {
  if (typeof value !== 'string' || !isAbsolute(value) || value === sep) {
    throw new Error(`${name} must be an absolute directory and must not be the filesystem root`);
  }
  return resolve(value);
}

export function containedPath(root, ...parts) {
  const target = resolve(root, ...parts);
  const rel = relative(resolve(root), target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new InputError('resolved path escapes the configured run directory');
  }
  return target;
}

export function bearerMatches(header, token) {
  if (!header?.startsWith('Bearer ') || !token) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeJsonAtomic(path, value) {
  await ensureDirectory(dirname(path));
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

export async function fileSha256(path) {
  try {
    const content = await readFile(path);
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function runCommand(command, args, options = {}) {
  const { cwd, env, stdoutPath, timeoutMs = 0, onStdoutLine } = options;
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timer;
    let pending = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      pending += chunk;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) onStdoutLine?.(line);
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', rejectPromise);
    child.on('close', async (code, signal) => {
      if (timer) clearTimeout(timer);
      if (pending) onStdoutLine?.(pending);
      if (stdoutPath) await writeFile(stdoutPath, stdout, { mode: 0o600 });
      resolvePromise({ code: code ?? 1, signal, stdout, stderr });
    });
    if (timeoutMs > 0) {
      timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
      timer.unref();
    }
  });
}

export async function git(repoPath, args, options = {}) {
  return await runCommand('git', ['-C', repoPath, ...args], options);
}

export async function gitSnapshot(repoPath) {
  const [head, branch, statusResult, diffResult, untrackedResult] = await Promise.all([
    git(repoPath, ['rev-parse', 'HEAD']),
    git(repoPath, ['branch', '--show-current']),
    git(repoPath, ['status', '--porcelain=v1', '--untracked-files=all']),
    git(repoPath, ['diff', '--binary', 'HEAD']),
    git(repoPath, ['ls-files', '--others', '--exclude-standard', '-z']),
  ]);
  if (head.code || branch.code || statusResult.code || diffResult.code || untrackedResult.code) {
    throw new Error('Git snapshot failed');
  }
  const digest = createHash('sha256').update(diffResult.stdout);
  const untracked = untrackedResult.stdout.split('\0').filter(Boolean).sort();
  for (const name of untracked) {
    digest.update(name).update(await readFile(containedPath(repoPath, name)));
  }
  return {
    head: head.stdout.trim(),
    branch: branch.stdout.trim(),
    status: statusResult.stdout.trim().split('\n').filter(Boolean).sort(),
    digest: digest.digest('hex'),
  };
}

export async function gitPathDigest(repoPath, paths) {
  const diffResult = await git(repoPath, ['diff', '--binary', 'HEAD', '--', ...paths]);
  const untrackedResult = await git(repoPath, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths]);
  if (diffResult.code || untrackedResult.code) throw new Error('Git path digest failed');
  const digest = createHash('sha256').update(diffResult.stdout);
  for (const name of untrackedResult.stdout.split('\0').filter(Boolean).sort()) {
    digest.update(name).update(await readFile(containedPath(repoPath, name)));
  }
  return digest.digest('hex');
}

export function changedStatusEntries(before, after) {
  const prior = new Set(before.status);
  return after.status.filter((entry) => !prior.has(entry));
}

export async function taskFile(repoPath, taskNumber) {
  const taskDirectory = join(repoPath, 'docs', 'tasks');
  const names = (await readdir(taskDirectory)).filter((name) => name.startsWith(`${taskNumber}-`) && name.endsWith('.md'));
  if (names.length !== 1) throw new Error(`Expected one task file for ${taskNumber}, found ${names.length}`);
  return join(taskDirectory, names[0]);
}

export async function taskMetadata(repoPath, taskNumber) {
  const path = await taskFile(repoPath, taskNumber);
  const content = await readFile(path, 'utf8');
  const branch = content.match(/\*\*Branch:\*\*\s*`([^`]+)`/)?.[1];
  const note = content.match(/## Note\s+([\s\S]*?)\s*$/)?.[1]?.trim() ?? null;
  if (!branch) throw new Error(`Task ${taskNumber} has no Branch line`);
  return { path, branch, note };
}

export async function missingSkills(repoPath, required = REQUIRED_SKILLS) {
  const missing = [];
  for (const skill of required) {
    if (!(await pathExists(join(repoPath, skill.path)))) missing.push(skill);
  }
  return missing;
}

export async function artifactSnapshot(repoPath, taskNumber) {
  const root = join(repoPath, 'docs', 'features', taskNumber);
  return await Promise.all(REQUIRED_ARTIFACTS.map(async (name) => {
    const path = join(root, `${taskNumber}-${name}.md`);
    const sha256 = await fileSha256(path);
    return { name, path, sha256, exists: sha256 !== null };
  }));
}

export function parseThreadEvent(line) {
  try {
    const event = JSON.parse(line);
    if (event.type === 'thread.started') return { threadId: event.thread_id, forbidden: null, event };
    const command = event?.type === 'item.completed' && event?.item?.type === 'command_execution'
      ? event.item.command ?? ''
      : '';
    return { threadId: null, forbidden: FORBIDDEN_COMMAND.test(command) ? command : null, event };
  } catch {
    return { threadId: null, forbidden: null, event: null };
  }
}

export function parseStreamJsonEvent(line) {
  const empty = { sessionId: null, commands: [], finalMessage: null };
  let event;
  try { event = JSON.parse(line); } catch { return empty; }
  if (event?.type === 'system' && event.subtype === 'init' && event.session_id) {
    return { ...empty, sessionId: event.session_id };
  }
  if (event?.type === 'result') {
    return {
      sessionId: event.session_id ?? null,
      commands: [],
      finalMessage: typeof event.result === 'string' ? event.result : null,
    };
  }
  const blocks = Array.isArray(event?.message?.content) ? event.message.content : [];
  const commands = blocks
    .filter((block) => block?.type === 'tool_use' && block.name === 'Bash' && typeof block.input?.command === 'string')
    .map((block) => block.input.command);
  return { ...empty, commands };
}

export function parseFindings(message, reviewer) {
  const findings = [];
  const rows = message.split('\n').filter((line) => /^\|\s*(HIGH|MEDIUM|LOW)\s*\|/i.test(line));
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, ''));
    if (cells.length < 4) continue;
    findings.push({
      id: `${reviewer === 'code' ? 'CR' : 'SR'}-${findings.length + 1}`,
      severity: cells[0].toUpperCase(),
      fileLine: cells[1],
      finding: cells[2],
      remediation: cells[3],
      reviewer,
    });
  }
  return findings;
}

export function planTaskLines(content) {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => /^##\s+Implementation Tasks\s*$/i.test(line));
  let scope = lines;
  if (start !== -1) {
    const after = lines.slice(start + 1);
    const next = after.findIndex((line) => /^##\s/.test(line));
    scope = next === -1 ? after : after.slice(0, next);
  }
  return scope.filter((line) => /^\s*\d+[.)]\s+\S/.test(line)).map((line) => line.trim());
}

export function countPlanTasks(content) {
  return planTaskLines(content).length;
}

export async function describeVerifyScript(repoPath) {
  let content;
  try { content = await readFile(join(repoPath, 'verify.sh'), 'utf8'); }
  catch { return null; }
  const steps = [...content.matchAll(/^\s*step\s+"([^"]+)"/gm)].map((match) => match[1]);
  if (!steps.length) return null;
  return { steps, runsSuites: /mvnw\s+test|npm\s+(?:run\s+)?test/.test(content) };
}

export function evidenceFromMessage(action, message, extra = {}) {
  const criterionIds = [...new Set(message.match(/AC-\d{2}-\d+\.\d+/g) ?? [])];
  const verdict = /\*\*NO-GO\*\*/.test(message) ? 'NO-GO' : /\*\*GO\*\*/.test(message) ? 'GO' : null;
  const verifyLine = message.split('\n').findLast?.((line) => /(?:✅ All green\.|❌ Fix the above)/.test(line)) ?? null;
  return { action, criterionIds, verdict, verifyLine, raw: message, ...extra };
}

export function failureFingerprint(action, exitCode, error) {
  return createHash('sha256').update(`${action}\0${exitCode}\0${String(error).slice(-1000)}`).digest('hex');
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function newId() {
  return randomUUID();
}

export class InputError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'InputError';
    this.statusCode = statusCode;
  }
}

export function safeName(path) {
  return basename(path).replace(/[^A-Za-z0-9._-]/g, '_');
}
