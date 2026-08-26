import { readFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import {
  InputError,
  artifactSnapshot,
  containedPath,
  ensureDirectory,
  git,
  gitSnapshot,
  missingSkills,
  newId,
  pathExists,
  readJson,
  requireAbsoluteDirectory,
  runCommand,
  taskMetadata,
  validateBaseRef,
  validateRunId,
  validateTaskNumber,
  writeJsonAtomic,
} from './lib.mjs';

const TERMINAL_STATUSES = new Set(['completed', 'stopped', 'blocked']);
const DEMO_SCENARIOS = new Set(['happy-path', 'planner-question', 'no-go-revision', 'gate-5-waiver', 'production-defect', 'missing-security-reviewer', 'selected-findings', 'repeated-failure']);
const GATE_DECISIONS = {
  1: new Set(['accept', 'revise', 'stop']),
  2: new Set(['accept', 'revise', 'stop']),
  3: new Set(['approve', 'sharpen', 'stop']),
  4: new Set(['revise-plan', 'stop', 'explicit-override', 'accept-go']),
  5: new Set(['continue', 'waive-remaining', 'stop']),
  6: new Set(['accept-green', 'return-production-defect', 'stop']),
  7: new Set(['all-high-medium', 'high-only', 'include-low', 'individual-ids', 'none', 'stop']),
};

export class StateStore {
  constructor({ runsDir, remoteUrl, engine }) {
    this.runsDir = requireAbsoluteDirectory(runsDir, 'PAYFLOW_RUNS_DIR');
    this.remoteUrl = remoteUrl;
    // Which authoring skills must exist depends on the client the engine drives.
    this.requiredSkills = engine?.requiredSkills;
  }

  async initialize() {
    await ensureDirectory(this.runsDir);
    await ensureDirectory(join(this.runsDir, '.trash'));
  }

  runDirectory(runId) {
    return containedPath(this.runsDir, validateRunId(runId));
  }

  statePath(runId) {
    return join(this.runDirectory(runId), 'state.json');
  }

  jobPath(runId, jobId) {
    return containedPath(this.runDirectory(runId), 'jobs', `${validateRunId(jobId)}.json`);
  }

  async listRuns() {
    await this.initialize();
    const names = await readdir(this.runsDir);
    const runs = [];
    for (const name of names) {
      if (!/^[0-9a-f-]{36}$/i.test(name)) continue;
      try { runs.push(await this.getRun(name)); } catch { /* Ignore incomplete directories. */ }
    }
    return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRun(runId) {
    return await readJson(this.statePath(runId));
  }

  async saveRun(run) {
    run.updatedAt = new Date().toISOString();
    await writeJsonAtomic(this.statePath(run.id), run);
    return run;
  }

  async getJob(runId, jobId) {
    return await readJson(this.jobPath(runId, jobId));
  }

  async findJob(jobId) {
    validateRunId(jobId);
    for (const run of await this.listRuns()) {
      const path = this.jobPath(run.id, jobId);
      if (await pathExists(path)) return await readJson(path);
    }
    const error = new Error(`Job ${jobId} was not found`);
    error.code = 'ENOENT';
    throw error;
  }

  async saveJob(job) {
    await writeJsonAtomic(this.jobPath(job.runId, job.id), job);
    return job;
  }

  async findJobByRequestId(runId, requestId) {
    const directory = join(this.runDirectory(runId), 'jobs');
    if (!(await pathExists(directory))) return null;
    for (const name of await readdir(directory)) {
      if (!name.endsWith('.json')) continue;
      const job = await readJson(join(directory, name));
      if (job.requestId === requestId) return job;
    }
    return null;
  }

  async createRun({ taskNumber, mode = 'real', baseRef = 'origin/main', demoScenario = 'happy-path' }) {
    validateTaskNumber(taskNumber);
    validateBaseRef(baseRef);
    if (!['real', 'demo'].includes(mode)) throw new InputError('mode must be real or demo');
    if (mode === 'demo' && !DEMO_SCENARIOS.has(demoScenario)) throw new InputError('demoScenario is not supported');
    if (mode === 'real') {
      const active = (await this.listRuns()).find((run) => run.mode === 'real' && !TERMINAL_STATUSES.has(run.status));
      if (active) throw new InputError(`Real run ${active.id} is already active`, 409);
    }

    const id = newId();
    const runDirectory = this.runDirectory(id);
    await ensureDirectory(join(runDirectory, 'jobs'));
    const run = {
      schemaVersion: 1,
      id,
      mode,
      demoScenario,
      taskNumber,
      baseRef,
      repoPath: mode === 'real' ? join(runDirectory, 'repo') : null,
      expectedBranch: mode === 'demo' ? `feature/${taskNumber}-demo` : null,
      taskNote: mode === 'demo' ? 'Demo mode uses deterministic evidence and does not modify a repository.' : null,
      status: 'initializing',
      currentPhase: 'preflight',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initialHead: null,
      gates: {},
      sessions: {},
      failures: {},
      artifacts: [],
      findings: [],
      coverage: null,
      forbiddenCommands: [],
      securityReviewer: 'unknown',
      securityReviewAcknowledged: false,
      verificationMeaningRecorded: false,
      gateFiveWaived: false,
      jobs: [],
      finalAudit: null,
    };
    await this.saveRun(run);

    if (mode === 'real') {
      try {
        await this.cloneRun(run);
      } catch (error) {
        run.status = 'blocked';
        run.blocker = error.message;
        await this.saveRun(run);
        throw error;
      }
    }
    else {
      run.status = 'awaiting_branch';
      run.artifacts = [];
      await this.saveRun(run);
    }
    return run;
  }

  async cloneRun(run) {
    const clone = await runCommand('git', ['clone', '--no-local', this.remoteUrl, run.repoPath], {
      timeoutMs: 180_000,
    });
    if (clone.code !== 0) {
      run.status = 'blocked';
      run.blocker = `Clone failed: ${clone.stderr.trim()}`;
      await this.saveRun(run);
      throw new Error(run.blocker);
    }
    if (run.baseRef !== 'origin/main') {
      const fetch = await git(run.repoPath, ['fetch', 'origin', run.baseRef], { timeoutMs: 120_000 });
      if (fetch.code !== 0) throw new Error(`Cannot fetch base ref ${run.baseRef}: ${fetch.stderr.trim()}`);
      const checkout = await git(run.repoPath, ['checkout', '--detach', run.baseRef]);
      if (checkout.code !== 0) throw new Error(`Cannot check out base ref ${run.baseRef}: ${checkout.stderr.trim()}`);
    }
    const metadata = await taskMetadata(run.repoPath, run.taskNumber);
    const snapshot = await gitSnapshot(run.repoPath);
    run.expectedBranch = metadata.branch;
    run.taskNote = metadata.note;
    run.initialHead = snapshot.head;
    run.initialBranch = snapshot.branch;
    run.missingSkills = await missingSkills(run.repoPath, this.requiredSkills);
    run.status = 'awaiting_branch';
    run.artifacts = await artifactSnapshot(run.repoPath, run.taskNumber);
    run.artifactBaseline = Object.fromEntries(run.artifacts.map((artifact) => [artifact.name, artifact.sha256]));
    await this.saveRun(run);
  }

  async refreshArtifacts(run) {
    if (run.mode === 'real') run.artifacts = await artifactSnapshot(run.repoPath, run.taskNumber);
    return await this.saveRun(run);
  }

  async recordGate(runId, gateNumber, body) {
    const run = await this.getRun(runId);
    const gate = Number(gateNumber);
    if (!Number.isInteger(gate) || gate < 1 || gate > 7) throw new InputError('gate number must be between 1 and 7');
    if (typeof body.decision !== 'string' || !body.decision.trim()) throw new InputError('gate decision is required');
    if (!GATE_DECISIONS[gate].has(body.decision)) throw new InputError(`decision is not valid for gate ${gate}`);
    run.gates[String(gate)] = {
      gate,
      decision: body.decision,
      decidedAt: new Date().toISOString(),
      details: body.details && typeof body.details === 'object' ? body.details : {},
    };
    if (gate === 5 && body.decision === 'waive-remaining') run.gateFiveWaived = true;
    if (gate === 7 && body.details?.continueWithoutSecurity === true) {
      run.securityReviewAcknowledged = true;
    }
    if (body.decision === 'stop') {
      run.status = 'stopped';
      run.currentPhase = `gate-${gate}`;
    }
    return await this.saveRun(run);
  }

  async stopRun(runId, reason = 'Stopped by the human') {
    const run = await this.getRun(runId);
    run.status = 'stopped';
    run.stopReason = reason;
    return await this.saveRun(run);
  }

  async cleanupRun(runId, { confirm = false, now = new Date() } = {}) {
    const run = await this.getRun(validateRunId(runId));
    if (!TERMINAL_STATUSES.has(run.status)) throw new InputError(`Run ${runId} is ${run.status}. Stop it before cleanup.`, 409);
    const source = this.runDirectory(runId);
    const destination = containedPath(this.runsDir, '.trash', `${runId}-${now.toISOString().replaceAll(':', '-')}`);
    if (confirm) await rename(source, destination);
    return { runId, source, destination, moved: confirm };
  }

  async readTaskContent(run) {
    if (run.mode !== 'real') return '';
    const metadata = await taskMetadata(run.repoPath, run.taskNumber);
    return await readFile(metadata.path, 'utf8');
  }
}
