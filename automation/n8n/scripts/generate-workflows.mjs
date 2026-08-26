import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const workflowsDirectory = join(root, 'workflows');
const nodes = [];
const connections = {};
let serial = 0;

function id() {
  serial += 1;
  return `00000000-0000-4000-8000-${String(serial).padStart(12, '0')}`;
}

function add(name, type, parameters, position, typeVersion = 1, extra = {}) {
  nodes.push({ id: id(), name, type, typeVersion, position, parameters, ...extra });
  return name;
}

function connect(from, to, output = 0, input = 0) {
  connections[from] ??= { main: [] };
  connections[from].main[output] ??= [];
  connections[from].main[output].push({ node: to, type: 'main', index: input });
}

// Shared recovery nodes. connect() records names, so these are referenced before they are added.
const ACTION_FAILED = 'Action Failed — Resume Or Stop';
const RUNNER_UNREACHABLE = 'Runner Unreachable — Execution Halted';
const RESUME_FORM = 'Resume — Choose Next Phase';
const STOP_RUN = 'Stop Retained Run';

const authHeaders = {
  parameters: [{ name: 'Authorization', value: "={{ 'Bearer ' + $env.PAYFLOW_RUNNER_TOKEN }}" }],
};

// Reading $env in an expression needs N8N_BLOCK_ENV_ACCESS_IN_NODE=false, which exposes the
// whole container environment to every workflow. Set PAYFLOW_N8N_CREDENTIAL_ID to the ID of a
// Header Auth credential instead, and turn that flag back on. See README.md.
const credentialId = process.env.PAYFLOW_N8N_CREDENTIAL_ID ?? '';
const CREDENTIAL_NAME = 'PayFlow Runner Token';
// With a credential the workflow must not read $env at all, so the runner URL is baked in
// at generation time. It is not a secret.
const runnerUrl = process.env.PAYFLOW_RUNNER_URL ?? 'http://host.docker.internal:5680';
const urlBase = credentialId ? `'${runnerUrl}'` : '$env.PAYFLOW_RUNNER_URL';

function authParameters() {
  return credentialId
    ? { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' }
    : { sendHeaders: true, headerParameters: authHeaders };
}

function authCredentials() {
  return credentialId ? { credentials: { httpHeaderAuth: { id: credentialId, name: CREDENTIAL_NAME } } } : {};
}

function http(name, method, path, body, position) {
  const parameters = {
    method,
    url: `={{ ${urlBase} + '${path}' }}`,
    ...authParameters(),
    options: { timeout: 3600000 },
  };
  if (body) {
    Object.assign(parameters, {
      sendBody: true,
      contentType: 'raw',
      rawContentType: 'application/json',
      body: `={{ JSON.stringify(${body}) }}`,
    });
  }
  return add(name, 'n8n-nodes-base.httpRequest', parameters, position, 4.2, authCredentials());
}

function action(name, actionName, position, payload = '{}') {
  return http(
    name,
    'POST',
    "/v1/runs/' + ($json.runId || $json.id) + '/actions",
    // $runIndex, not Date.now(): a retried node run must reuse its job instead of starting a second one.
    `{ action: '${actionName}', requestId: $execution.id + ':${actionName}:' + $runIndex, resume: true, payload: ${payload} }`,
    position,
  );
}

function poll(name, position) {
  const node = add(name, 'n8n-nodes-base.executeWorkflow', {
    source: 'database',
    workflowId: {
      __rl: true,
      value: 'payflow-poll-job',
      mode: 'list',
      cachedResultName: 'PayFlow Poll Job',
    },
    workflowInputs: {
      mappingMode: 'defineBelow',
      value: { jobId: '={{ $json.id }}' },
      matchingColumns: ['jobId'],
      schema: [{ id: 'jobId', displayName: 'jobId', required: true, defaultMatch: false, canBeUsedToMatch: true, display: true, type: 'string' }],
      attemptToConvertTypes: false,
      convertFieldsToString: true,
    },
    options: { waitForSubWorkflow: true },
  }, position, 1.2, { onError: 'continueErrorOutput' });
  // Output 1 is the error branch: the runner is unreachable or the job vanished.
  connect(node, RUNNER_UNREACHABLE, 1);
  return node;
}

// Every phase ends in a job-status check, so a failed action reaches a form instead of
// killing the execution. Output 0 is the success path every caller already connects to.
function phase(name, actionName, position, payload = '{}') {
  const submit = action(`${name} — Start`, actionName, position, payload);
  const wait = poll(`${name} — Poll`, [position[0] + 220, position[1]]);
  connect(submit, wait);
  const check = ifNode(`${name} — Job Succeeded?`, '={{ $json.status }}', 'equals', 'succeeded', [position[0] + 220, position[1] + 170]);
  connect(wait, check);
  connect(check, ACTION_FAILED, 1);
  return { submit, wait: check };
}

function form(name, title, description, fields, position, buttonLabel = 'Continue') {
  return add(name, 'n8n-nodes-base.form', {
    operation: 'page',
    formFields: { values: [...fields, textField('runId', 'Run ID', 'hiddenField', false, '={{ $json.runId || $json.id || "" }}')] },
    options: { formTitle: title, formDescription: description, buttonLabel },
  }, position, 2.6);
}

function dropdown(fieldName, fieldLabel, options, requiredField = true) {
  return {
    fieldName,
    fieldLabel,
    fieldType: 'dropdown',
    fieldOptions: { values: options.map((option) => ({ option })) },
    requiredField,
  };
}

function textField(fieldName, fieldLabel, fieldType = 'text', requiredField = false, fieldValue) {
  const valueProperty = fieldType === 'hiddenField' ? 'fieldValue' : 'defaultValue';
  return { fieldName, fieldLabel, fieldType, requiredField, ...(fieldValue === undefined ? {} : { [valueProperty]: fieldValue }) };
}

// Gate details are an explicit whitelist. Spreading the whole form output wrote the entire
// evidence blob into state.json and hid which keys the runner actually reads.
const GATE_DETAILS = [
  'revisionNote',
  'productionDefect',
  'sharpenTask',
  'task',
  'taskCount',
  'evidenceRaw',
].map((key) => `${key}: $json.${key} || undefined`).join(', ');

function gate(name, number, description, choices, position, extraFields = [], revisable = false) {
  const page = form(
    `${name} — Human Gate ${number}`,
    `${name} — Gate ${number}`,
    `${description}<br><br><b>Clone:</b> {{ $json.clonePath || $json.repoPath || '(demo mode: no clone)' }}<br><pre>{{ JSON.stringify($json.evidence || $json, null, 2) }}</pre>`,
    [
      dropdown('decision', 'Decision', choices),
      ...(revisable ? [textField('revisionNote', 'If you chose to revise, say what must change', 'textarea', false)] : []),
      textField('evidenceRaw', 'Evidence', 'hiddenField', false, '={{ JSON.stringify($json.evidence || $json) }}'),
      ...extraFields,
    ],
    position,
    'Record decision',
  );
  const record = http(
    `${name} — Record Gate ${number}`,
    'POST',
    `/v1/runs/' + $json.runId + '/gates/${number}`,
    `{ decision: $json.decision, details: { ${GATE_DETAILS} } }`,
    [position[0] + 220, position[1]],
  );
  connect(page, record);
  return { page, record };
}

function switchNode(name, value, outputs, position) {
  return add(name, 'n8n-nodes-base.switch', {
    rules: {
      values: outputs.map((output) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [{ leftValue: value, rightValue: output, operator: { type: 'string', operation: 'equals' } }],
          combinator: 'and',
        },
        renameOutput: true,
        outputKey: output,
      })),
    },
    options: {},
  }, position, 3.3);
}

function ifNode(name, leftValue, operation, rightValue, position) {
  const type = typeof rightValue === 'number' ? 'number' : typeof rightValue === 'boolean' ? 'boolean' : 'string';
  return add(name, 'n8n-nodes-base.if', {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ leftValue, rightValue, operator: { type, operation } }],
      combinator: 'and',
    },
    options: {},
  }, position, 2.2);
}

const start = add('Start or Resume PayFlow', 'n8n-nodes-base.formTrigger', {
  authentication: 'n8nUserAuth',
  requireExecuteAccess: false,
  formTitle: 'Local PayFlow Orchestrator',
  formDescription: 'Start a fresh isolated run, start a deterministic demo, or resume a retained run by ID.',
  formFields: { values: [
    dropdown('operation', 'Operation', ['new-real', 'new-demo', 'resume']),
    textField('taskNumber', 'Two-digit task number', 'text', false, '01'),
    textField('baseRef', 'Base ref', 'text', false, 'origin/main'),
    textField('runId', 'Retained run ID for resume'),
    dropdown('demoScenario', 'Demo scenario', ['happy-path', 'planner-question', 'no-go-revision', 'gate-5-waiver', 'production-defect', 'missing-security-reviewer', 'selected-findings', 'repeated-failure'], false),
  ] },
  options: { path: 'payflow', buttonLabel: 'Open run', useWorkflowTimezone: true },
}, [0, 0], 2.6);
nodes.find((node) => node.name === start).webhookId = '40000000-0000-4000-8000-000000000001';

// A failed action lands here instead of ending the execution in red.
form(
  ACTION_FAILED,
  'Action failed',
  "Action <b>{{ $json.action }}</b> ended as <b>{{ $json.status }}</b>.<br><b>Clone:</b> {{ $json.clonePath || '(demo mode: no clone)' }}<br><pre>{{ $json.error }}</pre>A <b>blocked</b> run already failed twice in the same way. It accepts no further action, so choose stop.",
  [dropdown('failureDecision', 'Decision', ['retry-phase', 'stop'])],
  [1160, 760],
  'Continue',
);
const failureRouter = switchNode('Route Action Failure', '={{ $json.failureDecision }}', ['retry-phase', 'stop'], [1400, 760]);
connect(ACTION_FAILED, failureRouter);
const reloadAfterFailure = http('Reload Run After Failure', 'GET', "/v1/runs/' + $json.runId + '", null, [1640, 700]);
connect(failureRouter, reloadAfterFailure, 0);
connect(reloadAfterFailure, RESUME_FORM);
connect(failureRouter, STOP_RUN, 1);
add(RUNNER_UNREACHABLE, 'n8n-nodes-base.form', {
  operation: 'completion',
  respondWith: 'text',
  completionTitle: 'The host runner could not be reached',
  completionMessage: '=The job could not be polled. Read automation/n8n/runner.log, run automation/n8n/bin/status.sh, then resume this run by ID from the start form. The retained run and its clone are untouched.',
  options: { formTitle: 'PayFlow runner unreachable' },
}, [1400, 940], 2.6);

const startRouter = switchNode('Route Start Mode', '={{ $json.operation }}', ['new-real', 'new-demo', 'resume'], [220, 0]);
connect(start, startRouter);
const createReal = http('Create Real Run', 'POST', '/v1/runs', "{ taskNumber: $json.taskNumber, mode: 'real', baseRef: $json.baseRef || 'origin/main' }", [460, -220]);
const createDemo = http('Create Demo Run', 'POST', '/v1/runs', "{ taskNumber: $json.taskNumber || '04', mode: 'demo', baseRef: $json.baseRef || 'origin/main', demoScenario: $json.demoScenario || 'happy-path' }", [460, 0]);
const loadRun = http('Load Retained Run', 'GET', "/v1/runs/' + $json.runId + '", null, [460, 220]);
connect(startRouter, createReal, 0);
connect(startRouter, createDemo, 1);
connect(startRouter, loadRun, 2);
const canonical = add('Canonical Run', 'n8n-nodes-base.code', { jsCode: 'return $input.all();' }, [700, 0], 2);
connect(createReal, canonical);
connect(createDemo, canonical);
connect(loadRun, canonical);

const resumed = ifNode('Is Resumed Run?', '={{ $("Start or Resume PayFlow").first().json.operation }}', 'equals', 'resume', [920, 0]);
connect(canonical, resumed);
const preflight = form('Preflight — Branch Decision', 'Preflight — Branch decision', "Task: <b>{{ $json.taskNumber }}</b><br>Expected branch: <b>{{ $json.expectedBranch }}</b><br>Note: {{ $json.taskNote || 'none' }}<br>Missing authoring skills: <b>{{ ($json.missingSkills || []).map(skill => skill.path).join(', ') || 'none' }}</b> — Task 00 writes them, and this workflow refuses to start without them.<br>Artifacts: <pre>{{ JSON.stringify($json.artifacts, null, 2) }}</pre><b>Clone:</b> {{ $json.repoPath || '(demo mode: no clone)' }}", [
  dropdown('decision', 'Branch decision', ['create-task-branch', 'use-current', 'stop']),
  dropdown('baseDeviationAcknowledged', 'Acknowledge a base other than origin/main', ['false', 'true'], false),
  dropdown('overwriteExistingArtifacts', 'Permit updates to existing workflow-owned artifacts', ['false', 'true'], false),
], [1160, -180], 'Apply branch decision');
const branch = phase('Preflight', 'branch', [1400, -180], "{ decision: $json.decision, baseDeviationAcknowledged: String($json.baseDeviationAcknowledged) === 'true', overwriteExistingArtifacts: String($json.overwriteExistingArtifacts) === 'true' }");
connect(resumed, preflight, 1);
connect(preflight, branch.submit);
const preflightRouter = switchNode('Route Preflight Decision', '={{ $json.evidence.decision }}', ['create-task-branch', 'use-current', 'stop'], [1840, -700]);
connect(branch.wait, preflightRouter);

const resumeForm = form(RESUME_FORM, 'Resume retained run', "Status: <b>{{ $json.status }}</b>; recorded phase: <b>{{ $json.currentPhase }}</b><br>Human-edited artifacts: {{ ($json.humanEditedArtifacts || []).join(', ') || 'none detected' }}<br><b>Clone:</b> {{ $json.repoPath || '(demo mode: no clone)' }}<br><br>Selecting a workflow-owned artifact phase is explicit consent to update that artifact while preserving other human edits.", [
  dropdown('resumePhase', 'Next phase', ['acceptance', 'adr', 'kickoff', 'plan', 'spec-check', 'build', 'verify', 'review', 'close', 'stop']),
  textField('resumeArtifactConsent', 'Artifact consent', 'hiddenField', false, 'true'),
], [1160, 180], 'Resume');
connect(resumed, resumeForm, 0);
const resumeRouter = switchNode('Route Resume Phase', '={{ $json.resumePhase }}', ['acceptance', 'adr', 'kickoff', 'plan', 'spec-check', 'build', 'verify', 'review', 'close', 'stop'], [1400, 180]);
connect(resumeForm, resumeRouter);

const acceptance = phase('Phase 1 Acceptance', 'acceptance', [1760, -540], "{ overwriteArtifact: String($json.resumeArtifactConsent) === 'true' || $json.gates?.['1']?.decision === 'revise' || $json.artifactOverwriteAcknowledged === true || $json.evidence?.artifactOverwriteAcknowledged === true, revisionNote: $json.gates?.['1']?.decision === 'revise' ? ($json.gates['1'].details.revisionNote || undefined) : undefined }");
connect(preflightRouter, acceptance.submit, 0);
connect(preflightRouter, acceptance.submit, 1);
connect(resumeRouter, acceptance.submit, 0);
const gate1 = gate('Acceptance', 1, "Confirm that every criterion is concrete and testable. Review the criteria counts and open questions.<br>Task note: <i>{{ $json.taskNote || 'none' }}</i>", ['accept', 'revise', 'stop'], [2200, -540], [], true);
connect(acceptance.wait, gate1.page);
const gate1Router = switchNode('Route Gate 1', '={{ $json.gates["1"].decision }}', ['accept', 'revise', 'stop'], [2460, -540]);
connect(gate1.record, gate1Router);

const adr = phase('Phase 2 ADR', 'adr', [2680, -460], "{ overwriteArtifact: String($json.resumeArtifactConsent) === 'true' || $json.gates?.['2']?.decision === 'revise' || $json.artifactOverwriteAcknowledged === true, revisionNote: $json.gates?.['2']?.decision === 'revise' ? ($json.gates['2'].details.revisionNote || undefined) : undefined }");
connect(gate1Router, adr.submit, 0);
connect(gate1Router, acceptance.submit, 1);
connect(resumeRouter, adr.submit, 1);
const gate2 = gate('ADR', 2, 'Accept the decisions, gaps, non-functional requirements, and code implications.', ['accept', 'revise', 'stop'], [3120, -460], [], true);
connect(adr.wait, gate2.page);
const gate2Router = switchNode('Route Gate 2', '={{ $json.gates["2"].decision }}', ['accept', 'revise', 'stop'], [3380, -460]);
connect(gate2.record, gate2Router);

const kickoff = phase('Phase 3 Kickoff', 'kickoff', [3600, -380], "{ overwriteArtifact: String($json.resumeArtifactConsent) === 'true' || $json.artifactOverwriteAcknowledged === true }");
connect(gate2Router, kickoff.submit, 0);
connect(gate2Router, adr.submit, 1);
connect(resumeRouter, kickoff.submit, 2);
// planIntent is stamped on the two re-plan edges. Reading it from persisted gate state
// instead would replay a stale sharpen request after a later coverage revision.
const plan = phase('Phase 4 Plan', 'plan', [4040, -380], "{ overwriteArtifact: true, answer: $json.plannerAnswer || undefined, sharpenTask: $json.planIntent === 'sharpen' ? ($json.gates['3'].details.sharpenTask || undefined) : undefined, coverageRevision: $json.planIntent === 'coverage-revision', revisionNote: $json.planIntent === 'coverage-revision' ? ($json.gates['4'].details.revisionNote || undefined) : undefined }");
connect(kickoff.wait, plan.submit);
connect(resumeRouter, plan.submit, 3);
const plannerQuestion = ifNode('Planner Needs Clarification?', '={{ $json.evidence.needsInput }}', 'equals', true, [4480, -380]);
connect(plan.wait, plannerQuestion);
const answerPlanner = form('Planner Clarification', 'Planner clarification', "The planner needs input before it can complete the plan.<br><pre>{{ $json.evidence.question || $json.finalMessage }}</pre><b>Clone:</b> {{ $json.clonePath || '(demo mode: no clone)' }}", [textField('plannerAnswer', 'Answer', 'textarea', true)], [4700, -520], 'Resume planner session');
connect(plannerQuestion, answerPlanner, 0);
connect(answerPlanner, plan.submit);
const gate3 = gate('Plan', 3, 'Approve the full plan, sharpen one vague task, or stop.', ['approve', 'sharpen', 'stop'], [4700, -280], [textField('sharpenTask', 'Task number to sharpen', 'number', false)]);
connect(plannerQuestion, gate3.page, 1);
const gate3Router = switchNode('Route Gate 3', '={{ $json.gates["3"].decision }}', ['approve', 'sharpen', 'stop'], [5140, -280]);
connect(gate3.record, gate3Router);
const sharpenIntent = add('Plan Revision — Sharpen', 'n8n-nodes-base.code', { jsCode: "return $input.all().map(item => ({ json: { ...item.json, planIntent: 'sharpen' } }));" }, [5140, -100], 2);
connect(gate3Router, sharpenIntent, 1);
connect(sharpenIntent, plan.submit);

const spec = phase('Phase 5 Coverage', 'spec-check', [5580, -200]);
connect(gate3Router, spec.submit, 0);
connect(resumeRouter, spec.submit, 4);
const gate4 = gate('Coverage', 4, 'NO-GO offers revision or stop first. Override is explicit and remains logged.', ['revise-plan', 'stop', 'explicit-override', 'accept-go'], [6020, -200], [], true);
connect(spec.wait, gate4.page);
const gate4Router = switchNode('Route Gate 4', '={{ $json.gates["4"].decision }}', ['revise-plan', 'stop', 'explicit-override', 'accept-go'], [6460, -200]);
connect(gate4.record, gate4Router);
const coverageIntent = add('Plan Revision — Coverage', 'n8n-nodes-base.code', { jsCode: "return $input.all().map(item => ({ json: { ...item.json, planIntent: 'coverage-revision' } }));" }, [6460, -420], 2);
connect(gate4Router, coverageIntent, 0);
connect(coverageIntent, plan.submit);

const getBuildRun = http('Phase 6 Build — Load Plan State', 'GET', "/v1/runs/' + ($json.runId || $json.id) + '", null, [6900, -40]);
connect(gate4Router, getBuildRun, 2);
connect(gate4Router, getBuildRun, 3);
connect(resumeRouter, getBuildRun, 5);
const prepareTasks = add('Phase 6 Build — Prepare Tasks', 'n8n-nodes-base.code', { jsCode: "const count = Number($json.planTaskCount); if (!Number.isInteger(count) || count < 1) { throw new Error('This run has no recorded plan task count. Resume at the plan phase so the plan is read before the build starts.'); } const runId = $json.id; return Array.from({ length: count }, (_, index) => ({ json: { runId, task: index + 1, taskCount: count } }));" }, [7120, -40], 2);
connect(getBuildRun, prepareTasks);
const taskLoop = add('Phase 6 Build — One Task at a Time', 'n8n-nodes-base.splitInBatches', { batchSize: 1, options: {} }, [7340, -40], 3);
connect(prepareTasks, taskLoop);
const buildTask = phase('Phase 6 Build Task', 'build-task', [7560, 80], '{ task: Number($json.task), taskCount: Number($json.taskCount) }');
connect(taskLoop, buildTask.submit, 1);
const firstTask = ifNode('Is First Build Task?', '={{ $json.evidence.task }}', 'equals', 1, [8000, 80]);
connect(buildTask.wait, firstTask);
const gate5First = gate('Build Task 1', 5, 'Review task 1. Only now may you waive the remaining per-task checks.', ['continue', 'waive-remaining', 'stop'], [8220, 0], [textField('task', 'Task', 'hiddenField', false, '={{ $json.evidence.task }}'), textField('taskCount', 'Task count', 'hiddenField', false, '={{ $json.evidence.taskCount }}')]);
const gate5Next = gate('Build Task', 5, 'Review this completed plan task before the next task starts.', ['continue', 'stop'], [8220, 180], [textField('task', 'Task', 'hiddenField', false, '={{ $json.evidence.task }}'), textField('taskCount', 'Task count', 'hiddenField', false, '={{ $json.evidence.taskCount }}')]);
connect(firstTask, gate5First.page, 0);
connect(firstTask, gate5Next.page, 1);
const gate5FirstRouter = switchNode('Route Gate 5 First', '={{ $json.gates["5"].decision }}', ['continue', 'waive-remaining', 'stop'], [8660, 0]);
const gate5NextRouter = switchNode('Route Gate 5 Next', '={{ $json.gates["5"].decision }}', ['continue', 'stop'], [8660, 180]);
connect(gate5First.record, gate5FirstRouter);
connect(gate5Next.record, gate5NextRouter);
connect(gate5FirstRouter, taskLoop, 0);
connect(gate5NextRouter, taskLoop, 0);
// Waiving on the last task leaves nothing to build. Skip straight to verification.
const remainingExist = ifNode('Remaining Tasks Exist?', "={{ Number($json.gates['5'].details.taskCount) > Number($json.gates['5'].details.task) }}", 'equals', true, [8900, -260]);
connect(gate5FirstRouter, remainingExist, 1);
const buildRemaining = phase('Phase 6 Build Remaining', 'build-remaining', [8900, -100], "{ fromTask: Number($json.gates['5'].details.task) + 1, toTask: Number($json.gates['5'].details.taskCount) }");
connect(remainingExist, buildRemaining.submit, 0);

const verify = phase('Phase 7 Tests', 'verify', [9340, -20]);
connect(taskLoop, verify.submit, 0);
connect(remainingExist, verify.submit, 1);
connect(buildRemaining.wait, verify.submit);
connect(resumeRouter, verify.submit, 6);
const gate6 = gate('Tests', 6, 'Accept green verification, return a production defect to the implementer, or stop.', ['accept-green', 'return-production-defect', 'stop'], [9780, -20], [textField('productionDefect', 'Production defect', 'textarea', false)]);
connect(verify.wait, gate6.page);
const gate6Router = switchNode('Route Gate 6', '={{ $json.gates["6"].decision }}', ['accept-green', 'return-production-defect', 'stop'], [10220, -20]);
connect(gate6.record, gate6Router);
const fixDefect = phase('Phase 9 Fix Production Defect', 'fix-defect', [10460, 120]);
connect(gate6Router, fixDefect.submit, 1);
connect(fixDefect.wait, verify.submit);

const review = phase('Phase 8 Code Review', 'review', [10460, -180]);
connect(gate6Router, review.submit, 0);
connect(resumeRouter, review.submit, 7);
const securityAvailable = ifNode('Security Reviewer Available?', '={{ $json.evidence.securityReviewer }}', 'equals', 'available', [10900, -180]);
connect(review.wait, securityAvailable);
const securityReview = phase('Phase 8 Security Review', 'security-review', [11120, -300]);
connect(securityAvailable, securityReview.submit, 0);
const missingSecurity = form('Missing Security Review — Acknowledge', 'Security review unavailable', "No security-reviewer exists in this clone. This is not a passing security review.<br><b>Clone:</b> {{ $json.clonePath || '(demo mode: no clone)' }}", [dropdown('securityDecision', 'Decision', ['continue-without-security-review', 'stop'])], [11120, -80], 'Record acknowledgement');
connect(securityAvailable, missingSecurity, 1);
const missingSecurityRouter = switchNode('Route Missing Security Review', '={{ $json.securityDecision }}', ['continue-without-security-review', 'stop'], [11340, -80]);
connect(missingSecurity, missingSecurityRouter);
const loadFindings = http('Phase 8 Review — Load Findings', 'GET', "/v1/runs/' + ($json.runId || $json.id) + '", null, [11560, -220]);
connect(securityReview.wait, loadFindings);
connect(missingSecurityRouter, loadFindings, 0);
const GATE_7_CHOICES = ['all-high-medium', 'high-only', 'include-low', 'individual-ids', 'none', 'stop'];
const gate7Page = form('Review Findings — Human Gate 7', 'Review Findings — Gate 7', "Select exactly which findings the implementer may fix. Missing security review remains explicitly acknowledged.<br><br><b>Clone:</b> {{ $json.repoPath || '(demo mode: no clone)' }}<br><pre>{{ JSON.stringify($json.findings || [], null, 2) }}</pre>", [dropdown('decision', 'Decision', GATE_7_CHOICES), textField('findingIds', 'Finding IDs, comma-separated', 'text', false), textField('continueWithoutSecurity', 'Security review acknowledgement', 'hiddenField', false, "={{ $json.securityReviewer === 'missing' }}"), textField('findingsJson', 'Findings', 'hiddenField', false, '={{ JSON.stringify($json.findings || []) }}')], [11800, -220], 'Record decision');
connect(loadFindings, gate7Page);
const resolveFindings = add('Resolve Selected Findings', 'n8n-nodes-base.code', { jsCode: "const gate = $json; const all = JSON.parse(gate.findingsJson || '[]'); let ids = []; if (gate.decision === 'all-high-medium') ids = all.filter(f => ['HIGH','MEDIUM'].includes(f.severity)).map(f => f.id); else if (gate.decision === 'high-only') ids = all.filter(f => f.severity === 'HIGH').map(f => f.id); else if (gate.decision === 'include-low') ids = all.map(f => f.id); else if (gate.decision === 'individual-ids') ids = String(gate.findingIds || '').split(',').map(x => x.trim()).filter(Boolean); return [{ json: { ...gate, selectedFindingIds: ids } }];" }, [12020, -220], 2);
connect(gate7Page, resolveFindings);
const recordGate7 = http('Review Findings — Record Gate 7', 'POST', "/v1/runs/' + $json.runId + '/gates/7", "{ decision: $json.decision, details: { selectedFindingIds: $json.selectedFindingIds, continueWithoutSecurity: String($json.continueWithoutSecurity) === 'true' } }", [12240, -220]);
connect(resolveFindings, recordGate7);
const gate7Router = switchNode('Route Gate 7', '={{ $json.gates["7"].decision }}', GATE_7_CHOICES, [12460, -220]);
connect(recordGate7, gate7Router);
const fixFindings = phase('Phase 9 Fix Selected Findings', 'fix-findings', [12700, -340], "{ selectedFindingIds: $json.gates['7'].details.selectedFindingIds }");
connect(gate7Router, fixFindings.submit, 0);
connect(gate7Router, fixFindings.submit, 1);
connect(gate7Router, fixFindings.submit, 2);
connect(gate7Router, fixFindings.submit, 3);
connect(fixFindings.wait, verify.submit);

const close = phase('Phase 10 Close', 'close', [12700, -100]);
connect(gate7Router, close.submit, 4);
connect(resumeRouter, close.submit, 8);
const audit = phase('Phase 10 Final Workflow Audit', 'final-audit', [13140, -100]);
connect(close.wait, audit.submit);
const complete = add('PayFlow Complete', 'n8n-nodes-base.form', { operation: 'completion', respondWith: 'text', completionTitle: "={{ $json.evidence.passed ? 'Final audit passed' : 'Final audit blocked the run' }}", completionMessage: "=Clone: {{ $json.clonePath || '(demo mode)' }}\n\n{{ JSON.stringify($json.evidence, null, 2) }}\n\nThe closeout artifact contains suggested commands. This automation did not commit, push, or create a PR.", options: { formTitle: 'PayFlow run complete' } }, [13580, -100], 2.6);
connect(audit.wait, complete);

const stop = http(STOP_RUN, 'POST', "/v1/runs/' + ($json.runId || $json.id) + '/stop", "{ reason: 'Stopped at a human gate' }", [12700, 220]);
connect(resumeRouter, stop, 9);
connect(preflightRouter, stop, 2);
connect(gate1Router, stop, 2);
connect(gate2Router, stop, 2);
connect(gate3Router, stop, 2);
connect(gate4Router, stop, 1);
connect(gate5FirstRouter, stop, 2);
connect(gate5NextRouter, stop, 1);
connect(gate6Router, stop, 2);
connect(gate7Router, stop, 5);
connect(missingSecurityRouter, stop, 1);
const stopped = add('PayFlow Stopped — Run Is Resumable', 'n8n-nodes-base.form', { operation: 'completion', respondWith: 'text', completionTitle: 'Run stopped safely', completionMessage: "=Run {{ $json.id }} is retained and resumable.\nClone: {{ $json.repoPath || '(demo mode)' }}", options: { formTitle: 'PayFlow stopped' } }, [12920, 220], 2.6);
connect(stop, stopped);

const workflow = {
  id: 'payflow-feature-orchestrator',
  name: 'PayFlow Feature Orchestrator',
  active: false,
  nodes,
  connections,
  settings: { executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all', saveManualExecutions: true, timezone: 'Europe/London' },
  pinData: {},
  versionId: '10000000-0000-4000-8000-000000000001',
  meta: { templateCredsSetupCompleted: true },
};

function pollingWorkflow() {
  const pollNodes = [
    {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Job Input',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      typeVersion: 1.1,
      position: [0, 0],
      parameters: { workflowInputs: { values: [{ name: 'jobId' }] } },
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      name: 'Get Job',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [240, 0],
      ...authCredentials(),
      parameters: {
        url: `={{ ${urlBase} + '/v1/jobs/' + $json.jobId }}`,
        ...authParameters(),
        options: { timeout: 30000 },
      },
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      name: 'Job Still Running?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [480, 0],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [{ leftValue: '={{ ["queued", "running"].includes($json.status) }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }],
          combinator: 'and',
        },
        options: {},
      },
    },
    {
      id: '20000000-0000-4000-8000-000000000004',
      name: 'Wait Two Seconds',
      type: 'n8n-nodes-base.wait',
      typeVersion: 1.1,
      position: [720, -100],
      webhookId: '30000000-0000-4000-8000-000000000001',
      parameters: { amount: 2, unit: 'seconds' },
    },
    {
      // The caller branches on job.status. Throwing here would end the execution in red
      // instead of routing the human to the recovery form.
      id: '20000000-0000-4000-8000-000000000005',
      name: 'Return Finished Job',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [720, 100],
      parameters: { jsCode: "return $input.all().map(item => ({ json: { ...item.json, error: item.json.error || null } }));" },
    },
  ];
  return {
    id: 'payflow-poll-job',
    name: 'PayFlow Poll Job',
    active: false,
    nodes: pollNodes,
    connections: {
      'Job Input': { main: [[{ node: 'Get Job', type: 'main', index: 0 }]] },
      'Get Job': { main: [[{ node: 'Job Still Running?', type: 'main', index: 0 }]] },
      'Job Still Running?': { main: [[{ node: 'Wait Two Seconds', type: 'main', index: 0 }], [{ node: 'Return Finished Job', type: 'main', index: 0 }]] },
      'Wait Two Seconds': { main: [[{ node: 'Get Job', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
    pinData: {},
    versionId: '10000000-0000-4000-8000-000000000002',
    meta: { templateCredsSetupCompleted: true },
  };
}

await mkdir(workflowsDirectory, { recursive: true });
await writeFile(join(workflowsDirectory, 'payflow-orchestrator.json'), `${JSON.stringify(workflow, null, 2)}\n`);
await writeFile(join(workflowsDirectory, 'payflow-poll-job.json'), `${JSON.stringify(pollingWorkflow(), null, 2)}\n`);
process.stdout.write(`Generated ${nodes.length}-node orchestrator and polling sub-workflow.\n`);
