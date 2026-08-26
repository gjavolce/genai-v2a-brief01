import { createServer } from 'node:http';
import { ActionRunner } from './action-runner.mjs';
import { loadConfig } from './config.mjs';
import {
  InputError,
  bearerMatches,
  newId,
  runCommand,
  validateAction,
  validateRunId,
} from './lib.mjs';
import { StateStore } from './state-store.mjs';

const config = loadConfig();
const store = new StateStore(config);
const actionRunner = new ActionRunner({ store, ...config });
const activeJobs = new Map();
await store.initialize();

const server = createServer(async (request, response) => {
  try {
    if (!bearerMatches(request.headers.authorization, config.token)) {
      return send(response, 401, { error: 'Unauthorized' });
    }
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/health') {
      return send(response, 200, await health());
    }
    if (request.method === 'POST' && url.pathname === '/v1/runs') {
      const body = await jsonBody(request);
      const run = await store.createRun(body);
      return send(response, 201, run);
    }
    if (request.method === 'GET' && url.pathname === '/v1/runs') {
      return send(response, 200, { runs: await store.listRuns() });
    }
    let match = url.pathname.match(/^\/v1\/runs\/([0-9a-f-]{36})$/i);
    if (request.method === 'GET' && match) {
      const run = await store.getRun(validateRunId(match[1]));
      return send(response, 200, await refreshHumanEdits(run));
    }
    match = url.pathname.match(/^\/v1\/runs\/([0-9a-f-]{36})\/actions$/i);
    if (request.method === 'POST' && match) {
      const runId = validateRunId(match[1]);
      const body = await jsonBody(request);
      const action = validateAction(body.action);
      const requestId = validateRequestId(body.requestId);
      const existing = await store.findJobByRequestId(runId, requestId);
      if (existing) return send(response, 200, existing);
      const run = await store.getRun(runId);
      if (run.status === 'blocked' || run.status === 'completed') {
        throw new InputError(`Run is ${run.status} and cannot accept another action`, 409);
      }
      if (run.status === 'stopped') {
        if (body.resume !== true) throw new InputError('Stopped run requires resume=true', 409);
        run.status = 'active';
        await store.saveRun(run);
      }
      if (activeJobs.has(runId)) throw new InputError(`Job ${activeJobs.get(runId)} is already running`, 409);
      const job = {
        schemaVersion: 1,
        id: newId(),
        runId,
        action,
        status: 'queued',
        requestId,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        exitCode: null,
        threadId: null,
        finalMessage: '',
        evidence: {},
        error: null,
      };
      await store.saveJob(job);
      activeJobs.set(runId, job.id);
      actionRunner.execute(job, body.payload ?? {}).finally(() => activeJobs.delete(runId));
      return send(response, 202, job);
    }
    match = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/i);
    if (request.method === 'GET' && match) {
      return send(response, 200, await store.findJob(validateRunId(match[1])));
    }
    match = url.pathname.match(/^\/v1\/runs\/([0-9a-f-]{36})\/gates\/([1-7])$/i);
    if (request.method === 'POST' && match) {
      const decision = await store.recordGate(validateRunId(match[1]), match[2], await jsonBody(request));
      return send(response, 200, decision);
    }
    match = url.pathname.match(/^\/v1\/runs\/([0-9a-f-]{36})\/stop$/i);
    if (request.method === 'POST' && match) {
      const body = await jsonBody(request);
      return send(response, 200, await store.stopRun(validateRunId(match[1]), body.reason));
    }
    return send(response, 404, { error: 'Not found' });
  } catch (error) {
    const status = error instanceof InputError ? error.statusCode : error.code === 'ENOENT' ? 404 : 500;
    return send(response, status, { error: error.message });
  }
});

server.listen(config.port, config.host, () => {
  process.stdout.write(`PayFlow runner listening on http://${config.host}:${config.port}\n`);
});

async function refreshHumanEdits(run) {
  if (run.mode !== 'real') return run;
  await store.refreshArtifacts(run);
  run.humanEditedArtifacts = run.artifacts
    .filter((artifact) => run.artifactBaseline?.[artifact.name] !== artifact.sha256)
    .map((artifact) => artifact.name);
  return run;
}

async function health() {
  const { version, auth } = config.engine.healthArgs;
  const [gitResult, engineResult, authResult, dockerResult] = await Promise.all([
    safeCommand('git', ['--version'], 10_000),
    safeCommand(config.engineBin, version, 10_000),
    auth ? safeCommand(config.engineBin, auth, 15_000) : Promise.resolve({ code: 0, stdout: 'not probed', stderr: '' }),
    safeCommand('docker', ['info', '--format', '{{.OperatingSystem}}'], 15_000),
  ]);
  const checks = {
    git: checkResult(gitResult),
    engine: checkResult(engineResult),
    engineAuth: checkResult(authResult),
    docker: checkResult(dockerResult),
  };
  return {
    ok: checks.git.ok && checks.docker.ok,
    realReady: Object.values(checks).every((check) => check.ok),
    demoReady: checks.docker.ok,
    engine: config.engine.id,
    engineBin: config.engineBin,
    model: config.model,
    checks,
  };
}

async function safeCommand(command, args, timeoutMs) {
  try { return await runCommand(command, args, { timeoutMs }); }
  catch (error) { return { code: 127, stdout: '', stderr: error.message }; }
}

function checkResult(result) {
  return { ok: result.code === 0, detail: (result.stdout || result.stderr).trim().split('\n').at(-1) };
}

function validateRequestId(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new InputError('requestId must be 8-160 safe characters');
  }
  return value;
}

async function jsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new InputError('Request body is too large', 413);
  }
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw new InputError('Request body must be valid JSON'); }
}

function send(response, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}
