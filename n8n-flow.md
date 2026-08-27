# n8n Flow

This file gives the run order for the n8n orchestrator kit. It gives no other
information. Read `automation/n8n/README.md` for the full explanation and
`automation/n8n/API.md` for the runner API.

This kit runs the same ten-phase workflow as `flow.md`, on an n8n canvas
instead of the command line. n8n shows the forms. A host Node.js service
holds Git, the agent CLI, Docker, and test execution.

## Setup — run once

| # | You type | You get |
|---|---|---|
| 1 | Choose an absolute run directory outside this repository. | a path, for example `/Users/you/payflow-n8n-runs` |
| 2 | `automation/n8n/bin/setup.sh /Users/you/payflow-n8n-runs` | a private `.env` file, with a runner token and an n8n encryption key |
| 🚦 | To drive the canonical `.claude/` roles instead of Codex, prefix step 2 with `PAYFLOW_ENGINE=claude`. Choose before you run it. | |
| 3 | `automation/n8n/bin/start.sh` | a health response, and n8n running at `http://localhost:5678` |
| 🚦 | **Check the health response.** Confirm `"realReady":true` before a real run. Demo mode does not need it. | |
| 4 | Open `http://localhost:5678`. Create the local n8n owner account. | an n8n login |
| 5 | `automation/n8n/bin/import-workflows.sh` | both workflows imported, activated, and n8n restarted |
| 6 | Open `http://localhost:5678/form/payflow`. Sign in as the owner. | the first form: `new`, `new-demo`, or `resume` |

Run step 5 again after every `npm run generate:workflows`. Do not skip the
activate-and-restart step it performs — n8n registers the form webhook only at
start-up.

## Run — every time

**Demo run.** Choose `new-demo`. Choose one scenario:
`happy-path`, `planner-question`, `no-go-revision`, `gate-5-waiver`,
`production-defect`, `missing-security-reviewer`, `selected-findings`,
`repeated-failure`.

A demo run uses the same objects and the same n8n branches as a real run. It
does not call Codex or Claude. It does not create a Git clone. Use it to
learn the ten phases and the seven gates without cost.

**Real run.** Choose `new`. Set `PAYFLOW_REMOTE_URL` before you start n8n —
a local path works, for example your checkout of this repository. The runner
clones it with `git clone --no-local`. This clone sees only committed work,
never your uncommitted changes.

Only one real run can be active. PayFlow verification uses fixed local
ports.

**Resume a run.** Choose `resume`. Enter the run ID. Read the reported
human-edited artifacts before you choose the next phase. Choosing a
workflow-owned artifact phase is your explicit permission to overwrite that
artifact.

## The forms are the gates

Each form shows evidence and the exact clone path before you decide. Gate 4
and both revision gates carry a note field — state what must change, or the
next attempt repeats the same result. A missing security review is shown as
missing. It is never shown as a pass.

An action that fails reaches an **Action failed** form. Choose retry or stop.
A second identical failure blocks the run. Only stop remains.

## Status, stop, and cleanup

| # | You type | You get |
|---|---|---|
| — | `automation/n8n/bin/status.sh` | tool readiness and container state |
| — | `automation/n8n/bin/stop.sh` | this Compose project and the host runner stopped. Unrelated containers and the named volume stay. |
| — | `cd automation/n8n && npm run cleanup -- <run-id>` | a dry-run report for that one retained run |
| — | `npm run cleanup -- <run-id> --confirm <run-id>` | that run moved to `PAYFLOW_RUNS_DIR/.trash/`, not erased |

## Checks before you trust a change

Run these without starting n8n:

```bash
cd automation/n8n
npm run generate:workflows
npm run validate:workflows
npm test
docker compose --env-file .env -f compose.yml config
```

Then, with n8n running and imported, run a disposable demo traversal:

```bash
cd automation/n8n
N8N_OWNER_EMAIL='you@example.com' N8N_OWNER_PASSWORD='your-local-password' npm run smoke:n8n-demo
npm run smoke:n8n-failure
npm run smoke:n8n-revision
```

`smoke:real` is opt-in. It builds a real Task 01 clone and runs the read-only
`spec-guardian` role against it. Do not run it unless you need to confirm a
real action end to end.

```bash
cd automation/n8n
npm run smoke:real
```

## Rules that do not change

- Nothing runs until you choose it on a form. No form submits itself.
- Every gate needs your decision. A demo run stops at the same gates as a
  real run.
- The workflow never commits, pushes, or opens a pull request. Closeout
  writes the approved artifacts and shows suggested commands only.
- Do not set `PAYFLOW_RUNS_DIR` to this repository, to `/`, or to a relative
  path.
