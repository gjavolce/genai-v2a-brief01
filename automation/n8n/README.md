# Local n8n PayFlow orchestrator

This kit shows the PayFlow workflow as an n8n canvas. n8n owns the visual flow
and human forms. A small Node.js service on the macOS host owns Git, fresh
clones, the agent CLI, Docker access, and test execution.

n8n does not receive a shell endpoint or the Docker socket. The workflow has no
Execute Command node. The host API accepts only fixed actions and builds every
prompt itself. It spawns programs with argument arrays and `shell: false`.

Two human-written fields reach a prompt: the planner answer and the production
defect text. Both come from a form that only the local operator can open.

## What the canvas shows

The main workflow contains all ten phases:

1. Preflight and branch choice.
2. Acceptance criteria and Gate 1.
3. ADR and Gate 2.
4. Kickoff, planning, planner clarification, plan persistence, and Gate 3.
5. Coverage review and Gate 4.
6. One implementer call per plan task and Gate 5 after each task.
7. Verification and Gate 6.
8. Code review, optional security review, missing-review acknowledgement, and
   Gate 7.
9. A production-defect or selected-finding fix, followed by verification.
10. Closeout and the final workflow audit.

Every decision uses an n8n form page. Each page shows evidence and the exact
clone path. Gate 4 lists revision and stop before its explicit override. Only
the first Gate 5 form offers the remaining-task waiver. A missing security
review is shown as missing and cannot be presented as a pass.

Gates 1, 2, and 4 carry a revision note. Choosing `revise` without saying what
must change would re-run the same prompt and produce the same artifact, so the
note travels into the next prompt. A Gate 4 `revise-plan` also quotes the exact
criteria the spec guardian marked as gaps.

No action can end the execution in red. A failed job reaches an
**Action failed** form that offers retry or stop. Retry reloads the run and
returns to the resume page. If the host runner itself cannot be reached, the
execution stops on a page that names the log to read. The retained run and its
clone survive both.

## Files

- `compose.yml` pins n8n 2.36.7, binds the UI to `127.0.0.1:5678`, and uses the
  `n8n-data` named volume.
- `workflows/payflow-orchestrator.json` is the 101-node main workflow.
- `workflows/payflow-poll-job.json` polls asynchronous host jobs with a Wait
  node.
- `runner/` is the dependency-free Node.js 20 host service and operator CLI.
- `runner/engines/` holds one module per agent CLI. See **Engines** below.
- `fixtures/demo-scenarios.json` contains deterministic no-Codex evidence.
- `scripts/generate-workflows.mjs` generates both workflow JSON files.
- `scripts/validate-workflows.mjs` checks names, connections, phases, gates,
  forms, action names, the Execute Command ban, node reachability, and every
  failure path.
- `API.md` documents the runner API and stable objects.

## Requirements

- macOS with Docker Desktop.
- Node.js 20 or later.
- Git.
- One authenticated agent CLI for real actions. Demo mode needs neither.

## Engines

`PAYFLOW_ENGINE` selects the CLI that runs each role.

| | `codex` | `claude` |
|---|---|---|
| Command | `codex exec` | `claude -p` |
| Roles read from | `.agents/` and `.codex/` | the canonical `.claude/` |
| Skill syntax | `$business-analyst 04` | `/business-analyst 04` |
| Planner | the project `planner` agent | the built-in `Plan` subagent |
| Session resume | `codex exec resume <id>` | `claude --resume <id>` |
| Authentication | `codex login` | `claude auth login` |
| Filesystem sandbox | `--sandbox read-only` or `workspace-write` | **none** |

Read that last row before a real run. Codex confines a write action to the
clone. Claude Code does not. On the Claude engine the guards are the throwaway
clone, `--disallowed-tools` for read-only roles, and the post-run ownership
check that compares Git digests before and after every action. Change the
permission flags with `PAYFLOW_CLAUDE_READ_ARGS` and `PAYFLOW_CLAUDE_WRITE_ARGS`.

The engine also decides which authoring skills must exist. Preflight refuses to
start when either is missing, names the file, and points at Task 00.

## Setup

Choose an absolute retained-run directory outside this repository. The setup
script creates the directory, a bearer token, an n8n encryption key, and a
private `.env` file.

```bash
automation/n8n/bin/setup.sh /Users/your-name/payflow-n8n-runs
# Or, to drive the canonical .claude/ roles:
PAYFLOW_ENGINE=claude automation/n8n/bin/setup.sh /Users/your-name/payflow-n8n-runs
automation/n8n/bin/start.sh
```

`start.sh` prints the health response. Check `realReady` before a real run.

Open <http://localhost:5678> and create the local n8n owner account. Then import
the workflows:

```bash
automation/n8n/bin/import-workflows.sh
```

The script imports the polling workflow first, activates both, restarts n8n, and
confirms that the form answers. Run it again after every
`npm run generate:workflows`. An import writes `active=false` from the file, and
n8n registers the form webhook only at start-up, so the activate and restart
steps are not optional.

Then open <http://localhost:5678/form/payflow> and sign in as the owner.

The runner listens only on `127.0.0.1:5680`. The n8n container reaches it with
`host.docker.internal`. The n8n UI listens only on `127.0.0.1:5678` and uses
n8n owner authentication.

## Demo runs

Choose `new-demo` on the first form. Demo runs use the same `Run`, `Job`, gate,
and evidence objects and the same n8n branches as real runs. They do not call
Codex and do not create a Git clone.

The available scenarios are:

- `happy-path`
- `planner-question`
- `no-go-revision`
- `gate-5-waiver`
- `production-defect`
- `missing-security-reviewer`
- `selected-findings`
- `repeated-failure`

The scenario controls the evidence. The forms control the decision. For
example, choose `waive-remaining` at the first Gate 5 form to exercise that
branch. For `repeated-failure`, resume the run and retry acceptance once. The
second identical failure blocks the run; the runner does not allow a third
automatic attempt.

## Real runs and retained state

A real run clones the configured remote at `origin/main` by default. Entering a
different validated base ref requires explicit acknowledgement at preflight.
Only one real run may be active because PayFlow verification uses fixed local
ports. Stopped, blocked, and completed clones remain under:

```text
PAYFLOW_RUNS_DIR/<run-id>/
├── repo/
├── state.json
└── jobs/
    ├── <job-id>.json
    ├── <job-id>.jsonl
    └── <job-id>.last-message.md
```

State and job JSON are written atomically. `state.json` contains artifact
hashes, gate decisions, failure fingerprints, findings, ownership violations,
verification meaning, and Codex session IDs. The planner session is resumed for
clarification and sharpening.

To resume, choose `resume`, enter the run ID, inspect the reported human-edited
artifacts, and choose the next phase. Existing human edits stay in the retained
clone. Selecting a workflow-owned artifact phase is the explicit permission to
update that artifact. The runner rejects an unapproved overwrite.

The workflow never copies output into this checkout. It never commits, pushes,
or creates a pull request. Closeout only writes the approved artifacts and
shows suggested commands.

## Status, stop, and recoverable cleanup

```bash
automation/n8n/bin/status.sh
automation/n8n/bin/stop.sh
```

`stop.sh` stops this Compose project and its host runner. It does not stop
unrelated containers and does not delete the named volume or retained runs.

Cleanup is a dry run by default and accepts only a terminal run UUID:

```bash
cd automation/n8n
npm run cleanup -- <run-id>
npm run cleanup -- <run-id> --confirm <run-id>
```

Confirmed cleanup moves that one run directory into
`PAYFLOW_RUNS_DIR/.trash/`. It does not erase it.

## Checks

Run the local checks without starting n8n:

```bash
cd automation/n8n
npm run generate:workflows
npm run validate:workflows
npm test
docker compose --env-file .env -f compose.yml config
```

`npm test` covers both engines: prompt rendering, argument building, event
parsing, ownership violations, and evidence normalization.

After the workflows are published, traverse the live n8n wait pages with a
disposable demo run. The credentials stay in the process environment:

```bash
cd automation/n8n
N8N_OWNER_EMAIL='you@example.com' \
N8N_OWNER_PASSWORD='your-local-password' \
npm run smoke:n8n-demo
```

Two more traversals cover the branches a happy path never reaches. Run them
with the same credentials:

```bash
npm run smoke:n8n-failure    # a failed action must reach the Action failed form
npm run smoke:n8n-revision   # a Gate 4 NO-GO must revise once and then pass
```

The real smoke is opt-in. It creates a fresh Task 01 clone, applies the
preflight `use-current` choice, runs only the read-only spec guardian, confirms
the Git digest and HEAD did not change, checks raw JSONL and exact thread-ID
storage, and stops but retains the run:

```bash
cd automation/n8n
npm run smoke:real
```

A real end-to-end setup test is intentionally excluded. It would build an
actual feature and use substantial model time.

## The runner token in n8n

By default every HTTP node reads `$env.PAYFLOW_RUNNER_TOKEN`. That needs
`N8N_BLOCK_ENV_ACCESS_IN_NODE: "false"` in `compose.yml`, which lets **any**
workflow in this instance read the whole container environment, including
`N8N_ENCRYPTION_KEY`. The instance is bound to loopback and holds one workflow,
so the exposure is small. It is not zero.

To remove it:

1. Open n8n, create a Header Auth credential named `PayFlow Runner Token` with
   name `Authorization` and value `Bearer <your PAYFLOW_RUNNER_TOKEN>`.
2. Copy its ID from the credential URL.
3. Set `PAYFLOW_N8N_CREDENTIAL_ID` in `.env`, then run
   `npm run generate:workflows` and re-import both workflows.
4. Set `N8N_BLOCK_ENV_ACCESS_IN_NODE: "true"` in `compose.yml` and restart.

The generated workflow then reads no environment variable at all. Generation
bakes `PAYFLOW_RUNNER_URL` into each node as a literal, so set that variable
before you generate. It is not a secret.

This path has not been exercised against a live n8n instance. Verify it with a
demo run before you rely on it.

## Troubleshooting

- Read `automation/n8n/runner.log` if the host service does not start.
- Run `automation/n8n/bin/status.sh` to inspect tool readiness and containers.
- If `realReady` is false, install or authenticate the engine CLI before a real
  action. `bin/status.sh` names the failing check. Demo mode remains available.
- If an action fails, the canvas shows the **Action failed** form. Choose retry
  to pick a phase again, or stop. An identical second failure blocks the run and
  only stop remains.
- If fixed PayFlow ports are busy, stop the conflicting stack. This kit never
  stops unrelated containers.
- Do not change `PAYFLOW_RUNS_DIR` to the repository, `/`, or a relative path.
