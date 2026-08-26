# Host runner API

The host runner listens on `127.0.0.1:5680`. Every request, including
`GET /health`, needs this header:

```text
Authorization: Bearer <PAYFLOW_RUNNER_TOKEN>
```

The runner accepts JSON request bodies and returns JSON. It has no endpoint for
shell commands, prompts, paths, Git arguments, or Docker arguments.

## Resources

### `GET /health`

Returns `demoReady`, `realReady`, the selected `engine`, its `engineBin` and
`model`, and the `checks` object: `git`, `engine`, `engineAuth`, and `docker`.
`engineAuth` reports `codex login status` or `claude auth status`.

### `POST /v1/runs`

```json
{
  "taskNumber": "04",
  "mode": "demo",
  "baseRef": "origin/main",
  "demoScenario": "happy-path"
}
```

`taskNumber` must contain two digits. `mode` is `demo` or `real`. A real run
clones the configured remote into `PAYFLOW_RUNS_DIR/<run-id>/repo`. The runner
allows one active real run. Demo runs may overlap.

A real run also records `missingSkills`. The engine decides which authoring
skills must exist. The `branch` action refuses to start while any is missing.

### `GET /v1/runs`

Lists retained runs. This endpoint supports the operator status view.

### `GET /v1/runs/{runId}`

Returns a run and refreshes its artifact hashes. For a real run, the response
also lists feature artifacts that differ from the fresh-clone baseline.

### `POST /v1/runs/{runId}/actions`

```json
{
  "action": "spec-check",
  "requestId": "execution-123:spec-check:1",
  "resume": true,
  "payload": {}
}
```

The fixed action names are `branch`, `acceptance`, `adr`, `kickoff`, `plan`,
`spec-check`, `build-task`, `build-remaining`, `verify`, `review`,
`security-review`, `fix-defect`, `fix-findings`, `close`, and `final-audit`.
The runner builds every prompt. A repeated `requestId` returns the original job
and does not submit another process. The workflow composes the ID from the n8n
execution ID, the action, and the node run index, so a retried node reuses its
job instead of starting a second one.

These payload fields change the prompt:

| Action | Field | Effect |
|---|---|---|
| `acceptance`, `adr` | `revisionNote` | Tells the skill what the human rejected. |
| `acceptance`, `adr`, `kickoff`, `plan` | `overwriteArtifact` | Consent to replace an existing artifact. |
| `plan` | `answer` | Answers a planner question in the retained session. |
| `plan` | `sharpenTask` | Breaks one vague task into concrete steps. |
| `plan` | `coverageRevision` | Revises the plan against the recorded coverage gaps. Refused when the run has none. |
| `build-task` | `task` | Which plan task to build. |
| `build-remaining` | `fromTask`, `toTask` | The waived range. `fromTask` above `toTask` is refused. |
| `fix-findings` | `selectedFindingIds` | Must all exist on the run. |
| `branch` | `decision`, `baseDeviationAcknowledged`, `overwriteExistingArtifacts` | Preflight consent. |

### `GET /v1/jobs/{jobId}`

Returns the job state, normalized evidence, final message, exit code, and exact
Codex thread ID. Each real job also retains its raw Codex JSONL stream and final
message in the run directory.

### `POST /v1/runs/{runId}/gates/{gateNumber}`

```json
{
  "decision": "explicit-override",
  "details": {
    "revisionNote": "Cover AC-04-1.2 in task 2."
  }
}
```

The gate number must be 1 through 7. Each gate has a fixed decision allowlist:

| Gate | Decisions |
|---|---|
| 1, 2 | `accept`, `revise`, `stop` |
| 3 | `approve`, `sharpen`, `stop` |
| 4 | `revise-plan`, `stop`, `explicit-override`, `accept-go` |
| 5 | `continue`, `waive-remaining`, `stop` |
| 6 | `accept-green`, `return-production-defect`, `stop` |
| 7 | `all-high-medium`, `high-only`, `include-low`, `individual-ids`, `none`, `stop` |

The workflow sends a fixed set of detail keys: `revisionNote`,
`productionDefect`, `sharpenTask`, `task`, `taskCount`, and `evidenceRaw`.

### `POST /v1/runs/{runId}/stop`

```json
{ "reason": "Stopped by the operator" }
```

Stopping does not delete the clone. Send `resume: true` with a later action to
resume it.

## Stable objects

`Run`, `Job`, `Artifact`, `Finding`, `GateDecision`, and `FinalAudit` are
documented as JSDoc types in `runner/types.mjs`. State files use schema version
1 and are replaced atomically.

A `verify` job records `verificationMeaning`, derived by reading `verify.sh`
from the clone and listing its real steps. It sets `verificationMeaningRecorded`
only when `verify.sh` actually ran and could be read. The final audit fails
without it, so accepting green at Gate 6 without running `verify.sh` cannot pass
the audit.

A `spec-check` job records `coverage` on the run: the verdict, the criteria that
appear on a gap line, and the gap lines themselves. The `plan` action reads it
when `coverageRevision` is set.
