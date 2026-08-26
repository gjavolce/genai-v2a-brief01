import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  FORBIDDEN_COMMAND,
  InputError,
  READ_ONLY_ACTIONS,
  artifactSnapshot,
  countPlanTasks,
  describeVerifyScript,
  evidenceFromMessage,
  failureFingerprint,
  git,
  gitPathDigest,
  gitSnapshot,
  parseFindings,
  pathExists,
  planTaskLines,
  readJson,
  runCommand,
  validateFindingIds,
  validateTaskIndex,
} from './lib.mjs';

const ACTION_ARTIFACT = {
  acceptance: 'acceptance',
  adr: 'adr',
  kickoff: 'plan-request',
  plan: 'plan',
};

const ACTION_PHASE = {
  acceptance: 'gate-1',
  adr: 'gate-2',
  kickoff: 'plan',
  plan: 'gate-3',
  'spec-check': 'gate-4',
  'build-task': 'gate-5',
  'build-remaining': 'gate-5',
  verify: 'gate-6',
  review: 'security-review',
  'security-review': 'gate-7',
  'fix-defect': 'verify-after-defect',
  'fix-findings': 'verify-after-fixes',
  close: 'final-audit',
  'final-audit': 'complete',
  branch: 'acceptance',
};

export class ActionRunner {
  constructor({ store, engine, engineBin, model, fixturePath, environment = process.env }) {
    this.store = store;
    this.engine = engine;
    this.engineBin = engineBin;
    this.model = model;
    this.fixturePath = fixturePath;
    this.environment = environment;
  }

  async execute(job, payload) {
    let run = await this.store.getRun(job.runId);
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    await this.store.saveJob(job);
    try {
      const result = run.mode === 'demo'
        ? await this.executeDemo(run, job.action, payload)
        : await this.executeReal(run, job, payload);
      run = await this.store.getRun(job.runId);
      job.status = 'succeeded';
      job.exitCode = 0;
      job.threadId = result.threadId ?? null;
      job.finalMessage = result.finalMessage ?? result.evidence?.raw ?? '';
      job.evidence = result.evidence ?? {};
      job.clonePath = run.repoPath;
      job.taskNote = run.taskNote ?? null;
      job.completedAt = new Date().toISOString();
      run.currentPhase = ACTION_PHASE[job.action] ?? run.currentPhase;
      run.status = job.action === 'final-audit' && result.evidence?.passed ? 'completed' : 'active';
      if (job.action === 'branch' && result.evidence?.decision === 'stop') run.status = 'stopped';
      if (job.action === 'final-audit' && !result.evidence?.passed) run.status = 'blocked';
      if (job.threadId) run.sessions[job.action === 'plan' ? 'planner' : job.action] = job.threadId;
      if (job.action === 'verify') {
        run.verificationMeaningRecorded = result.evidence?.verificationMeaningRecorded === true;
      }
      if (job.action === 'plan' && result.evidence?.taskCount) {
        run.planTaskCount = result.evidence.taskCount;
      }
      if (job.action === 'spec-check') {
        run.coverage = {
          verdict: result.evidence?.verdict ?? null,
          uncoveredCriteria: result.evidence?.uncoveredCriteria ?? [],
          gapLines: result.evidence?.gapLines ?? [],
          reasons: result.evidence?.reasons ?? [],
          report: String(result.evidence?.raw ?? job.finalMessage ?? '').slice(0, 4000),
        };
      }
      if (job.action === 'review') {
        run.securityReviewer = result.evidence.securityReviewer;
        run.findings = result.evidence.findings ?? [];
      }
      if (job.action === 'security-review') {
        run.findings = [...run.findings.filter((finding) => finding.reviewer !== 'security'), ...(result.evidence.findings ?? [])];
      }
      if (job.action === 'final-audit') run.finalAudit = result.evidence;
      run.jobs.push(job.id);
      await this.store.refreshArtifacts(run);
      await this.store.saveJob(job);
    } catch (error) {
      run = await this.store.getRun(job.runId);
      const fingerprint = failureFingerprint(job.action, error.exitCode ?? 1, error.message);
      run.failures[fingerprint] = (run.failures[fingerprint] ?? 0) + 1;
      const repeated = run.failures[fingerprint] >= 2;
      job.status = repeated ? 'blocked' : 'failed';
      job.exitCode = error.exitCode ?? 1;
      job.error = error.message;
      job.clonePath = run.repoPath;
      job.taskNote = run.taskNote ?? null;
      job.completedAt = new Date().toISOString();
      run.status = repeated ? 'blocked' : 'active';
      run.currentPhase = repeated ? `blocked-${job.action}` : job.action;
      run.jobs.push(job.id);
      await this.store.saveJob(job);
      await this.store.saveRun(run);
    }
  }

  async executeDemo(run, action, payload) {
    const fixtures = await readJson(this.fixturePath);
    const common = fixtures['happy-path']?.[action] ?? { raw: `Demo action ${action} completed.` };
    let override = fixtures[run.demoScenario]?.[action] ?? {};
    if (run.demoScenario === 'planner-question' && action === 'plan' && (payload.answer || payload.sharpenTask)) override = {};
    if (run.demoScenario === 'no-go-revision' && action === 'spec-check' && run.gates['4']?.decision === 'revise-plan') override = {};
    if (run.demoScenario === 'production-defect' && action === 'verify' && run.demoDefectFixed) override = {};
    const evidence = { ...common, ...override, action, demo: true };
    if (evidence.forceFailure) throw new Error(evidence.raw);
    if (action === 'branch') {
      if (payload.decision === 'stop') {
        await this.store.stopRun(run.id, 'Stopped at branch preflight');
        return { evidence: { action, decision: 'stop', demo: true, raw: 'Stopped at preflight.' }, finalMessage: 'Stopped at preflight.' };
      }
      run.status = 'active';
      run.currentBranch = payload.decision === 'create-task-branch' ? run.expectedBranch : 'main';
      run.artifactOverwriteAcknowledged = payload.overwriteExistingArtifacts === true;
      evidence.decision = payload.decision;
      evidence.artifactOverwriteAcknowledged = run.artifactOverwriteAcknowledged;
      await this.store.saveRun(run);
    }
    if (action === 'review') {
      evidence.findings = parseFindings(evidence.raw, 'code');
      evidence.securityReviewer = 'missing';
    }
    if (action === 'security-review') evidence.findings = parseFindings(evidence.raw, 'security');
    if (action === 'fix-defect') {
      run.demoDefectFixed = true;
      await this.store.saveRun(run);
    }
    if (action === 'build-task' || action === 'build-remaining') {
      evidence.task = payload.task ?? null;
      evidence.taskCount = payload.taskCount ?? payload.toTask ?? null;
    }
    if (action === 'final-audit') return { evidence: this.demoFinalAudit(run) };
    return { evidence, finalMessage: evidence.raw, threadId: action === 'plan' ? `demo-${run.id}` : null };
  }

  demoFinalAudit(run) {
    const gates = Object.keys(run.gates).map(Number);
    const failures = [];
    if (![1, 2, 3, 4, 5, 6, 7].every((gate) => gates.includes(gate))) failures.push('Not all seven gates occurred.');
    return {
      action: 'final-audit',
      allGatesOccurred: failures.length === 0,
      gateFiveCompleteOrWaived: Boolean(run.gates['5']) || run.gateFiveWaived,
      ownershipValid: true,
      noForbiddenGitCommands: true,
      requiredArtifactsPresent: true,
      threeLayersChanged: true,
      verificationMeaningRecorded: true,
      failures,
      passed: failures.length === 0,
      demo: true,
      raw: failures.length === 0 ? 'Demo final audit passed.' : failures.join('\n'),
    };
  }

  async executeReal(run, job, payload) {
    if (actionNeedsArtifactConsent(run, job.action) && payload.overwriteArtifact !== true) {
      throw new InputError(`${ACTION_ARTIFACT[job.action]} already exists; explicit overwriteArtifact consent is required`);
    }
    if (job.action === 'branch') return await this.changeBranch(run, payload);
    if (job.action === 'final-audit') return { evidence: await this.finalAudit(run) };
    const before = await gitSnapshot(run.repoPath);
    const beforeProduction = await gitPathDigest(run.repoPath, ['api/src/main', 'web/src']);
    const response = await this.runEngineAction(run, job, payload);
    const after = await gitSnapshot(run.repoPath);
    const afterProduction = await gitPathDigest(run.repoPath, ['api/src/main', 'web/src']);
    const ownershipViolations = this.ownershipViolations(run, job.action, before, after, beforeProduction, afterProduction);
    if (ownershipViolations.length) {
      run.ownershipViolations = [...(run.ownershipViolations ?? []), ...ownershipViolations];
      await this.store.saveRun(run);
      throw new Error(ownershipViolations.join('; '));
    }
    if (response.exitCode !== 0) {
      const error = new Error(response.stderr || `Codex exited with ${response.exitCode}`);
      error.exitCode = response.exitCode;
      throw error;
    }
    return response;
  }

  async changeBranch(run, payload) {
    const decision = payload.decision;
    if (!['create-task-branch', 'use-current', 'stop'].includes(decision)) throw new InputError('Invalid branch decision');
    if (decision === 'stop') {
      await this.store.stopRun(run.id, 'Stopped at branch preflight');
      return { evidence: { action: 'branch', decision, raw: 'Stopped at preflight.' }, finalMessage: 'Stopped at preflight.' };
    }
    const missing = run.missingSkills ?? [];
    if (missing.length) {
      throw new InputError(`This clone has no ${missing.map((skill) => skill.path).join(' and no ')}. Task 00 writes ${missing.length > 1 ? 'these skills' : 'that skill'}. Complete Task 00 before this workflow runs.`);
    }
    if (decision === 'create-task-branch') {
      if (run.baseRef !== 'origin/main' && payload.baseDeviationAcknowledged !== true) {
        throw new InputError('A non-main base requires explicit baseDeviationAcknowledged consent');
      }
      const result = await git(run.repoPath, ['switch', '-c', run.expectedBranch]);
      if (result.code !== 0) throw new Error(result.stderr.trim());
    }
    const snapshot = await gitSnapshot(run.repoPath);
    run.currentBranch = snapshot.branch;
    run.artifactOverwriteAcknowledged = payload.overwriteExistingArtifacts === true;
    run.status = 'active';
    run.currentPhase = 'acceptance';
    await this.store.saveRun(run);
    return {
      evidence: { action: 'branch', decision, currentBranch: snapshot.branch, artifactOverwriteAcknowledged: run.artifactOverwriteAcknowledged, raw: `Current branch: ${snapshot.branch}` },
      finalMessage: `Current branch: ${snapshot.branch}`,
    };
  }

  async runEngineAction(run, job, payload) {
    const prompt = this.promptFor(run, job.action, payload);
    const jobDirectory = join(this.store.runDirectory(run.id), 'jobs');
    const lastMessagePath = join(jobDirectory, `${job.id}.last-message.md`);
    const jsonlPath = join(jobDirectory, `${job.id}.jsonl`);
    let threadId = null;
    let streamedFinalMessage = '';
    const commands = [];
    const forbidden = [];
    const onStdoutLine = (line) => {
      const parsed = this.engine.parseEvent(line);
      if (parsed.sessionId) threadId = parsed.sessionId;
      if (parsed.finalMessage) streamedFinalMessage = parsed.finalMessage;
      for (const command of parsed.commands ?? []) {
        commands.push(command);
        if (FORBIDDEN_COMMAND.test(command)) forbidden.push(command);
      }
    };
    const args = this.engine.buildArgs({
      prompt,
      repoPath: run.repoPath,
      // Only the planner session is resumed; every other action starts clean.
      sessionId: job.action === 'plan' ? run.sessions.planner ?? null : null,
      readOnly: READ_ONLY_ACTIONS.has(job.action),
      model: this.model,
      lastMessagePath,
      environment: this.environment,
    });
    const result = await runCommand(this.engineBin, args, {
      cwd: run.repoPath,
      stdoutPath: jsonlPath,
      timeoutMs: 3_600_000,
      env: { COMPOSE_PROJECT_NAME: `payflow_n8n_${run.id.slice(0, 8)}` },
      onStdoutLine,
    });
    if (forbidden.length) {
      run.forbiddenCommands.push(...forbidden);
      await this.store.saveRun(run);
    }
    const finalMessage = this.engine.usesLastMessageFile
      ? ((await pathExists(lastMessagePath)) ? await readFile(lastMessagePath, 'utf8') : '')
      : streamedFinalMessage;
    const evidence = await this.normalizeEvidence(run, job.action, finalMessage, commands, payload);
    return { exitCode: result.code, stderr: result.stderr.trim(), threadId, finalMessage, evidence };
  }

  promptFor(run, action, payload) {
    const nn = run.taskNumber;
    switch (action) {
      case 'acceptance': return withRevision(this.engine.skill('business-analyst', nn), payload, 'acceptance criteria');
      case 'adr': return withRevision(this.engine.skill('architect', nn), payload, 'ADR');
      case 'kickoff': return this.engine.skill('feature-kickoff', nn);
      case 'plan': {
        if (payload.coverageRevision) return this.coverageRevisionPrompt(run, payload);
        const writePlan = this.engine.skill('feature-plan', nn);
        if (payload.sharpenTask) {
          return `Task ${validateTaskIndex(payload.sharpenTask, 'sharpenTask')} is too vague. Break it into concrete steps naming the files and methods you will change. Then invoke ${writePlan}.`;
        }
        if (payload.answer) {
          return `Use this human answer: ${String(payload.answer)}. Finish the plan. Then invoke ${writePlan}.`;
        }
        return `Use ${this.engine.plannerAgent} with exactly:\n\nPlan the work in docs/features/${nn}/${nn}-plan-request.md\n\nIf the planner asks a question, return it. Do not answer it. If the planner returns a plan, invoke ${writePlan}.`;
      }
      case 'spec-check': return verbatim(
        `Use the spec-guardian subagent to check docs/features/${nn}/${nn}-plan.md against docs/features/${nn}/${nn}-acceptance.md`,
        'the coverage table, the numbered gap list, and the verdict',
      );
      case 'build-task': return `Use the implementer subagent to build task ${validateTaskIndex(payload.task)} of docs/features/${nn}/${nn}-plan.md`;
      case 'build-remaining': {
        const fromTask = validateTaskIndex(payload.fromTask, 'fromTask');
        const toTask = validateTaskIndex(payload.toTask, 'toTask');
        if (fromTask > toTask) throw new InputError('fromTask must not be greater than toTask');
        return `The human waived the remaining gate-5 checks. Use the implementer subagent to build tasks ${fromTask} through ${toTask} of docs/features/${nn}/${nn}-plan.md in plan order.`;
      }
      case 'verify': return verbatim(
        `Use the test-verifier subagent to verify task ${nn}`,
        'the criterion-to-test table and the final verify.sh result line',
      );
      case 'review': return verbatim(
        `Use the code-reviewer subagent to review the diff for task ${nn}`,
        'the findings table, with its severity, file:line, finding, and remediation columns',
      );
      case 'security-review': return verbatim(
        `Use the security-reviewer subagent to review the diff for task ${nn}`,
        'the findings table, with its severity, file:line, finding, and remediation columns',
      );
      case 'fix-defect': {
        const details = run.gates['6']?.details ?? {};
        const defect = [details.productionDefect, details.evidenceRaw]
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .find(Boolean);
        if (!defect) throw new InputError('Gate 6 recorded no production defect and no verification evidence');
        return `Use the implementer subagent to fix the production defect described below. Do not change the test. Change nothing else.\n\n${defect}`;
      }
      case 'fix-findings': {
        const ids = validateFindingIds(payload.selectedFindingIds);
        const selected = run.findings.filter((finding) => ids.includes(finding.id));
        if (selected.length !== ids.length) throw new InputError('A selected finding does not exist in this run');
        return `Use the implementer subagent to fix only these selected findings. Change nothing else.\n\n${selected.map((finding) => `${finding.id} ${finding.severity} ${finding.fileLine}: ${finding.finding}. Remediation: ${finding.remediation}`).join('\n')}`;
      }
      case 'close': {
        const reviewContext = JSON.stringify({
          findings: run.findings,
          securityReviewer: run.securityReviewer,
          continueWithoutSecurity: run.securityReviewAcknowledged,
          verificationMeaningRecorded: run.verificationMeaningRecorded,
        });
        return `The recorded review context is below. It is evidence from this workflow.\n${reviewContext}\n\nInvoke ${this.engine.skill('feature-close', nn)}. Do not run commit, push, or PR commands.`;
      }
      default: throw new InputError(`No Codex prompt exists for action ${action}`);
    }
  }

  coverageRevisionPrompt(run, payload) {
    const nn = run.taskNumber;
    const coverage = run.coverage ?? {};
    const uncovered = (coverage.uncoveredCriteria ?? []).join(', ');
    const gaps = (coverage.gapLines ?? []).join('\n');
    const reasons = (coverage.reasons ?? []).join('\n');
    const report = coverage.report ?? '';
    if (!uncovered && !gaps && !reasons && !report) {
      throw new InputError('No spec-guardian coverage report is recorded for this run');
    }
    const note = revisionNote(payload);
    return [
      `The spec guardian returned NO-GO for docs/features/${nn}/${nn}-plan.md.`,
      uncovered ? `Uncovered criteria: ${uncovered}` : null,
      gaps ? `Rows marked as a gap:\n${gaps}` : null,
      reasons ? `Reported gaps and scope items:\n${reasons}` : null,
      !gaps && !reasons && report ? `Spec guardian report:\n${report}` : null,
      note ? `The human added this instruction: ${note}` : null,
      `Revise docs/features/${nn}/${nn}-plan.md to close the gaps above. Do not write code. Then invoke ${this.engine.skill('feature-plan', nn)}.`,
    ].filter(Boolean).join('\n\n');
  }

  async normalizeEvidence(run, action, message, commands, payload) {
    const base = evidenceFromMessage(action, message, { commands });
    if (action === 'plan') {
      const planPath = join(run.repoPath, 'docs', 'features', run.taskNumber, `${run.taskNumber}-plan.md`);
      if (!(await pathExists(planPath))) {
        return { ...base, needsInput: /\?\s*$/.test(message.trim()), question: message.trim() };
      }
      const plan = await readFile(planPath, 'utf8');
      return {
        ...base,
        taskCount: countPlanTasks(plan),
        taskTitles: planTaskLines(plan),
        sharpenedTask: payload.sharpenTask ?? null,
      };
    }
    if (action === 'spec-check') {
      const lines = message.split('\n');
      const gapLines = lines.filter((line) => /GAP|\u274c/.test(line));
      const uncoveredCriteria = [...new Set(gapLines.flatMap((line) => line.match(/AC-\d{2}-\d+\.\d+/g) ?? []))];
      // A real NO-GO often marks every criterion covered and states the gaps as a numbered
      // list of vague tasks or scope items. Capture that list too, or a revision has nothing
      // to act on.
      const reasons = lines.filter((line) => /^\s*\d+[.)]\s+\S/.test(line)).map((line) => line.trim());
      return { ...base, uncoveredCriteria: base.verdict === 'NO-GO' ? uncoveredCriteria : [], gapLines, reasons };
    }
    if (action === 'build-task' || action === 'build-remaining') {
      const diff = await git(run.repoPath, ['diff', '--stat']);
      return { ...base, diffStat: diff.stdout.trim(), task: payload.task ?? null, taskCount: payload.taskCount ?? null };
    }
    if (action === 'verify') {
      const apiSuiteExecuted = commands.some((command) => command.includes('./mvnw test'));
      const webSuiteExecuted = commands.some((command) => command.includes('npm test'));
      const suitesExecuted = apiSuiteExecuted && webSuiteExecuted;
      const verifyExecuted = commands.some((command) => /(?:^|\s)\.\/verify\.sh(?:\s|$)/.test(command));
      const script = await describeVerifyScript(run.repoPath);
      return {
        ...base,
        apiSuiteExecuted,
        webSuiteExecuted,
        suitesExecuted,
        verifyExecuted,
        verifyScriptSteps: script?.steps ?? [],
        productionDefect: /production defect/i.test(message),
        // The audit may only pass when the meaning is derived from an actual verify.sh run.
        verificationMeaningRecorded: verifyExecuted && script !== null,
        verificationMeaning: verificationMeaning(verifyExecuted, script, apiSuiteExecuted, webSuiteExecuted),
      };
    }
    if (action === 'review') {
      const probes = await Promise.all(
        this.engine.securityReviewerPaths.map((relative) => pathExists(join(run.repoPath, relative))),
      );
      const securityReviewer = probes.some(Boolean) ? 'available' : 'missing';
      return { ...base, findings: parseFindings(message, 'code'), securityReviewer };
    }
    if (action === 'security-review') return { ...base, findings: parseFindings(message, 'security') };
    return base;
  }

  ownershipViolations(run, action, before, after, beforeProduction, afterProduction) {
    const violations = [];
    if (before.head !== after.head) violations.push(`${action} created a commit; HEAD changed`);
    if (READ_ONLY_ACTIONS.has(action) && before.digest !== after.digest) violations.push(`${action} changed the working tree but is read-only`);
    if (action === 'verify' && beforeProduction !== afterProduction) violations.push('test-verifier changed production code');
    const allowed = {
      acceptance: [`docs/features/${run.taskNumber}/${run.taskNumber}-acceptance.md`],
      adr: [`docs/features/${run.taskNumber}/${run.taskNumber}-adr.md`],
      kickoff: [`docs/features/${run.taskNumber}/${run.taskNumber}-plan-request.md`],
      plan: [`docs/features/${run.taskNumber}/${run.taskNumber}-plan.md`],
      close: [
        `docs/features/${run.taskNumber}/${run.taskNumber}-PR.md`,
        `docs/features/${run.taskNumber}/${run.taskNumber}-acceptance.md`,
      ],
    }[action];
    if (allowed) {
      const prior = new Set(before.status);
      const added = after.status.filter((entry) => !prior.has(entry)).map((entry) => entry.slice(3).trim());
      for (const path of added) if (!allowed.includes(path)) violations.push(`${action} changed disallowed path ${path}`);
    }
    return violations;
  }

  async finalAudit(run) {
    const snapshot = await gitSnapshot(run.repoPath);
    const artifacts = await artifactSnapshot(run.repoPath, run.taskNumber);
    const changed = snapshot.status.map((entry) => entry.slice(3).trim());
    const gates = Object.keys(run.gates).map(Number);
    const result = {
      action: 'final-audit',
      allGatesOccurred: [1, 2, 3, 4, 5, 6, 7].every((gate) => gates.includes(gate)),
      gateFiveCompleteOrWaived: Boolean(run.gates['5']) || run.gateFiveWaived,
      ownershipValid: !(run.ownershipViolations?.length),
      noForbiddenGitCommands: run.forbiddenCommands.length === 0 && snapshot.head === run.initialHead,
      requiredArtifactsPresent: artifacts.every((artifact) => artifact.exists),
      threeLayersChanged: [
        'api/src/main/resources/db/migration/',
        'api/src/main/java/',
        'web/src/',
      ].every((prefix) => changed.some((path) => path.startsWith(prefix))),
      verificationMeaningRecorded: run.verificationMeaningRecorded,
      failures: [],
    };
    for (const [key, label] of Object.entries({
      allGatesOccurred: 'Not all seven gates occurred.',
      gateFiveCompleteOrWaived: 'Gate 5 did not occur and was not waived.',
      ownershipValid: 'An agent changed files outside its ownership boundary.',
      noForbiddenGitCommands: 'A commit, push, PR command, or HEAD change occurred.',
      requiredArtifactsPresent: 'A required feature artifact is missing.',
      threeLayersChanged: 'The diff does not change database, backend, and frontend.',
      verificationMeaningRecorded: 'The workflow did not record what verify.sh checked.',
    })) if (!result[key]) result.failures.push(label);
    result.passed = result.failures.length === 0;
    result.raw = result.passed ? 'Final audit passed.' : result.failures.join('\n');
    return result;
  }
}

// A Claude main agent summarizes what its subagent returned. A summary drops the tables
// that gate 4 and gate 7 must show and that parseFindings reads, so ask for them verbatim.
function verbatim(invocation, what) {
  return `${invocation}\n\nReturn ${what} verbatim, exactly as the subagent wrote them. Do not summarize them and do not rewrite them.`;
}

export function revisionNote(payload) {
  const note = typeof payload.revisionNote === 'string' ? payload.revisionNote.trim() : '';
  if (!note) return null;
  if (note.length > 4000) throw new InputError('revisionNote must be 4000 characters or fewer');
  return note;
}

function withRevision(invocation, payload, artifactName) {
  const note = revisionNote(payload);
  if (!note) return invocation;
  return `The human rejected the previous ${artifactName} at its gate. Apply this instruction, then write the artifact again.\n\n${note}\n\n${invocation}`;
}

function verificationMeaning(verifyExecuted, script, apiSuiteExecuted, webSuiteExecuted) {
  if (!verifyExecuted) return 'verify.sh did not run. Green was not established for this task.';
  if (!script) return 'verify.sh ran, but this workflow could not read it to state what it checked.';
  const suites = `In this job the API suite ${apiSuiteExecuted ? 'ran' : 'did not run'} and the web suite ${webSuiteExecuted ? 'ran' : 'did not run'}.`;
  const scope = script.runsSuites
    ? 'verify.sh runs the unit test suites, so green includes them.'
    : 'verify.sh does not run the unit test suites. Green means the stack started and the smoke test passed. It does not mean that the test suites passed.';
  return `verify.sh checked: ${script.steps.join('; ')}. ${scope} ${suites}`;
}

function actionNeedsArtifactConsent(run, action) {
  const artifact = ACTION_ARTIFACT[action];
  return artifact && run.artifacts.some((item) => item.name === artifact && item.exists);
}
