import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const main = JSON.parse(await readFile(join(root, 'workflows', 'payflow-orchestrator.json'), 'utf8'));
const poll = JSON.parse(await readFile(join(root, 'workflows', 'payflow-poll-job.json'), 'utf8'));

validateWorkflow(main);
validateWorkflow(poll);
assert.equal(main.id, 'payflow-feature-orchestrator');
assert.equal(poll.id, 'payflow-poll-job');
assert(main.nodes.some((node) => node.type === 'n8n-nodes-base.formTrigger'), 'main workflow needs a Form Trigger');
assert(poll.nodes.some((node) => node.type === 'n8n-nodes-base.wait'), 'polling workflow needs a Wait node');
assert(poll.nodes.some((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger'), 'polling workflow needs a sub-workflow trigger');

const allNodes = [...main.nodes, ...poll.nodes];
assert(!allNodes.some((node) => /executecommand/i.test(node.type)), 'Execute Command is forbidden');
assert(!JSON.stringify(allNodes).includes('/var/run/docker.sock'), 'the Docker socket must not be mounted or referenced');

for (let phase = 1; phase <= 10; phase += 1) {
  assert(main.nodes.some((node) => node.name.startsWith(`Phase ${phase} `)), `phase ${phase} is not visible`);
}
const gates = new Set(main.nodes.map((node) => node.name.match(/Human Gate ([1-7])/)?.[1]).filter(Boolean));
assert.deepEqual([...gates].sort(), ['1', '2', '3', '4', '5', '6', '7']);

const decisionForms = main.nodes.filter((node) => node.type === 'n8n-nodes-base.form' && node.parameters.operation === 'page');
assert(decisionForms.length >= 7, 'all human decisions must use form pages');
for (const node of decisionForms) {
  assert(String(node.parameters.options?.formDescription).includes('Clone:') || node.name === 'Planner Clarification', `${node.name} must show the clone path`);
}

const actionBodies = main.nodes
  .filter((node) => node.type === 'n8n-nodes-base.httpRequest' && String(node.parameters.url).endsWith("'/actions"))
  .map((node) => String(node.parameters.body));
const allowed = new Set(['acceptance', 'adr', 'kickoff', 'plan', 'spec-check', 'build-task', 'build-remaining', 'verify', 'review', 'security-review', 'fix-defect', 'fix-findings', 'close', 'final-audit', 'branch']);
for (const body of actionBodies) {
  const action = body.match(/action: '([^']+)'/)?.[1];
  assert(allowed.has(action), `workflow contains unapproved action ${action}`);
}

const byName = new Map(main.nodes.map((node) => [node.name, node]));
const targets = (name, output) => (main.connections[name]?.main?.[output] ?? []).map((edge) => edge.node);

// Every phase must end on a form, never on a red execution.
const submits = main.nodes.filter((node) => node.name.endsWith(' — Start') && node.type === 'n8n-nodes-base.httpRequest');
assert(submits.length >= 15, `expected every phase to submit an action, found ${submits.length}`);
for (const submit of submits) {
  const phaseName = submit.name.replace(/ — Start$/, '');
  const pollName = `${phaseName} — Poll`;
  const checkName = `${phaseName} — Job Succeeded?`;
  assert(byName.has(pollName), `${phaseName} has no polling node`);
  assert(byName.has(checkName), `${phaseName} does not check the job status`);
  assert.equal(byName.get(pollName).onError, 'continueErrorOutput', `${pollName} must not end the execution on error`);
  assert.deepEqual(targets(pollName, 1), ['Runner Unreachable — Execution Halted'], `${pollName} must route its error output to the halt page`);
  assert.deepEqual(targets(checkName, 1), ['Action Failed — Resume Or Stop'], `${checkName} must route a failed job to the recovery form`);
}

// The recovery form must lead somewhere, not dead-end.
assert.deepEqual(targets('Action Failed — Resume Or Stop', 0), ['Route Action Failure']);
assert.deepEqual(targets('Route Action Failure', 0), ['Reload Run After Failure']);
assert.deepEqual(targets('Route Action Failure', 1), ['Stop Retained Run']);
assert.deepEqual(targets('Reload Run After Failure', 0), ['Resume — Choose Next Phase']);

// A re-plan must state which kind of revision it is, rather than inferring it from stale gate state.
for (const stamp of ['Plan Revision — Coverage', 'Plan Revision — Sharpen']) {
  assert(byName.has(stamp), `${stamp} is missing`);
  assert.deepEqual(targets(stamp, 0), ['Phase 4 Plan — Start'], `${stamp} must feed the plan action`);
}
assert(String(byName.get('Phase 4 Plan — Start').parameters.body).includes('planIntent'), 'the plan payload must read planIntent');

// Waiving on the last task must skip the empty build range.
assert.deepEqual(targets('Remaining Tasks Exist?', 0), ['Phase 6 Build Remaining — Start']);
assert.deepEqual(targets('Remaining Tasks Exist?', 1), ['Phase 7 Tests — Start']);

// A wall-clock request ID would defeat the runner's idempotence.
assert(!JSON.stringify(main).includes('Date.now()'), 'request IDs must not use Date.now()');

// The runner rejects a request ID under eight characters. Every action must clear that on
// the shortest possible execution ID and run index.
for (const node of main.nodes.filter((n) => String(n.parameters?.body ?? '').includes('requestId'))) {
  const built = String(node.parameters.body).match(/requestId: (.+?), resume:/)?.[1];
  assert(built, `${node.name} has no readable requestId expression`);
  const shortest = built
    .replace(/\$execution\.id/g, '1')
    .replace(/\$runIndex/g, '0')
    .split('+')
    .map((part) => part.trim().replace(/^'|'$/g, ''))
    .join('');
  assert(shortest.length >= 8, `${node.name} builds a ${shortest.length}-character requestId ("${shortest}"); the runner needs 8`);
  assert(/^[A-Za-z0-9._:-]+$/.test(shortest), `${node.name} builds an unsafe requestId "${shortest}"`);
}

// Every node must be reachable from the trigger.
const seen = new Set();
const pending = ['Start or Resume PayFlow'];
while (pending.length) {
  const name = pending.pop();
  if (seen.has(name)) continue;
  seen.add(name);
  for (const output of main.connections[name]?.main ?? []) for (const edge of output ?? []) pending.push(edge.node);
}
const orphans = main.nodes.map((node) => node.name).filter((name) => !seen.has(name));
assert.deepEqual(orphans, [], `unreachable nodes: ${orphans.join(', ')}`);

// The polling loop re-enters Get Job with the Job object, so the URL must accept both shapes.
const getJob = poll.nodes.find((node) => node.name === 'Get Job');
assert(getJob, 'the polling workflow needs a Get Job node');
assert(
  /\$json\.jobId \|\| \$json\.id/.test(String(getJob.parameters.url)),
  'Get Job must read $json.jobId || $json.id, or the second poll requests /v1/jobs/undefined',
);
assert.equal(getJob.retryOnFail, true, 'Get Job must tolerate a transient failure');

process.stdout.write(`Validated ${main.nodes.length} main nodes, ${poll.nodes.length} polling nodes, ten phases, seven gates, and every failure path.\n`);

function validateWorkflow(workflow) {
  const names = new Set(workflow.nodes.map((node) => node.name));
  assert.equal(names.size, workflow.nodes.length, `${workflow.name} has duplicate node names`);
  for (const [source, outputs] of Object.entries(workflow.connections)) {
    assert(names.has(source), `${workflow.name} connection source ${source} does not exist`);
    for (const output of outputs.main ?? []) {
      for (const target of output ?? []) assert(names.has(target.node), `${workflow.name} connection target ${target.node} does not exist`);
    }
  }
}
