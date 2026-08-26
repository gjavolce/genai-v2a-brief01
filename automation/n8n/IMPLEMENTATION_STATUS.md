# Local n8n PayFlow orchestrator — implementation status

Date: 2026-08-26

## Current result

The kit runs the gated PayFlow workflow as an n8n canvas backed by a host
runner. It does not change this checkout and does not copy generated feature
work into it.

Implemented:

- n8n 2.36.7 in Docker, bound to `127.0.0.1:5678` with a named data volume.
- A dependency-free Node.js host runner bound to `127.0.0.1:5680`.
- Bearer authentication on every runner endpoint.
- Two engines behind one interface: Codex CLI and Claude Code CLI.
- Fresh real-run clones under an absolute external `PAYFLOW_RUNS_DIR`.
- Atomic run and job state, raw JSONL, final messages, normalized evidence,
  artifact hashes, findings, gate decisions, and final-audit state.
- One active real-run limit and concurrent demo runs.
- Fixed action allowlisting. n8n has no arbitrary command endpoint and no
  Docker socket.
- Argument arrays and `shell: false` for every spawned process.
- Planner clarification, plan sharpening, and coverage revision through the
  retained planner session.
- Ownership checks for read-only roles and production-code checks for the test
  verifier.
- Two-identical-failures blocking with no third automatic retry.
- Dry-run cleanup that moves one validated terminal run into a recoverable
  `.trash` directory.

## n8n workflows

- `workflows/payflow-orchestrator.json`: 101 nodes.
- `workflows/payflow-poll-job.json`: 5 nodes.

The canvas shows all ten phases and all seven gate numbers, plus fresh and
retained entry paths, preflight branch choice, base-ref acknowledgement, the
coverage GO, revision, stop, and explicit override branches, one implementer job
per plan task, a remaining-task waiver only on the first Gate 5 page, the
production-defect return, the optional security review with an explicit
missing-review acknowledgement, exact selected-finding resolution, closeout, and
the final audit. It never commits, pushes, or creates a pull request.

## Changes in this pass

Review of the first working version found nine defects and three gaps against
`.claude/skills/orchestrator/SKILL.md`. All are fixed.

Failure handling:

- Every phase now ends on a job-status check. A failed action reaches an
  **Action failed** form offering retry or stop. Before, the polling
  sub-workflow threw and the whole execution ended in red with no page.
- Each polling node routes its own error output to a page that names the log to
  read, for the case where the host runner is unreachable.
- Waiving Gate 5 on the last task now skips the empty build range instead of
  submitting `fromTask > toTask` and failing.
- A demo stop at preflight returns evidence like a real stop. It used to throw,
  so the demo could not reach the stop page that real runs use.

Human intent through the gates:

- Gates 1, 2, and 4 carry a revision note into the next prompt. `revise` used to
  re-run an identical prompt, which produced an identical artifact.
- A Gate 4 `revise-plan` now quotes the recorded uncovered criteria and gap
  lines and instructs the planner to close them without writing code. The
  revision loop could not converge before, and the two-failure guard never fired
  because the jobs succeeded.
- The re-plan edges stamp an explicit `planIntent`. Reading the intent from
  persisted gate state replayed a stale sharpen request after a later coverage
  revision.

Evidence correctness:

- `verificationMeaning` is read from the clone's `verify.sh` and lists its real
  steps. `verificationMeaningRecorded` is true only when `verify.sh` ran and
  could be read, so the final audit can now fail on it. It was always true.
- `uncoveredCriteria` is parsed per line. A single gap anywhere used to mark
  every mentioned criterion as uncovered.
- Request IDs use the n8n node run index, not `Date.now()`. Idempotence was
  documented but unreachable.
- Resuming into `build` without a recorded plan task count now stops with a
  clear message instead of silently building only task 1.
- `countPlanTasks` reads only the `## Implementation Tasks` section.
- The Gate 6 defect fallback reads the key the form actually sends, and treats
  an empty string as absent.

Contract gaps:

- Preflight refuses to start when an authoring skill is missing, names the file,
  and points at Task 00.
- Gate 1 shows the task Note.
- Gate 7 offers the canonical `include-low`.

Hygiene:

- Gate details are an explicit whitelist instead of the whole form output.
- `stop.sh` confirms the PID belongs to the runner before killing it.
- `PAYFLOW_N8N_CREDENTIAL_ID` generates a workflow that reads no environment
  variable, so `N8N_BLOCK_ENV_ACCESS_IN_NODE` can be `true`.

## Automated checks

`npm test` passes 44 tests, up from 17. New coverage:

- Prompt rendering for every action on both engines.
- Revision notes, coverage revision, and intent precedence.
- Engine argument building and stream-json event parsing.
- Ownership violations: commits, read-only writes, test-verifier production
  writes, and per-action path allowlists.
- Verification meaning and per-line gap parsing.
- Demo preflight stop, coverage revision convergence, and `include-low`.

`npm run validate:workflows` passes. It now also checks that every phase has a
status check and an error route, that the recovery cluster is wired, that the
re-plan edges stamp an intent, that no request ID uses `Date.now()`, and that
every node is reachable from the trigger.

## Live verification

A disposable n8n 2.36.7 instance ran on ports 5688 and 5689, with its own volume
and runs directory. It was removed afterwards. The owner account was created
through `POST /rest/owner/setup`, so no manual browser step was needed.

Confirmed:

- Both workflows imported. A round-trip export preserved 101 nodes, all 15
  polling error routes, and all 15 job-status checks.
- The production form requires the n8n owner login. It answers 302 to an
  anonymous request.
- `happy-path` traversed nine wait forms and completed. The final audit passed
  with no failures.
- `repeated-failure` reached the **Action failed** form and stopped cleanly. The
  execution did not end in error.
- `no-go-revision` traversed eleven wait forms. Gate 4 returned NO-GO, the plan
  was revised, the second spec check returned GO, and the run completed with a
  passing final audit.
- The NO-GO run recorded `coverage.uncoveredCriteria = ["AC-04-1.2"]`, which
  confirms the per-line gap parsing.

### Two defects that only the live run found

1. **Request IDs were too short.** `$execution.id + ':' + action + ':' +
   $runIndex` produced `1:adr:0`, which is seven characters. The runner requires
   eight. `Date.now()` had hidden the rule. Request IDs now carry a `payflow-`
   prefix, and `validate-workflows.mjs` computes the shortest possible ID for
   every action and asserts the length and the character set.

2. **The polling loop requested `/v1/jobs/undefined`.** `Get Job` read
   `$json.jobId`. That field exists only on the first iteration, which comes
   from the sub-workflow trigger. After `Wait Two Seconds` the item is the Job
   object, which carries `id`. Every iteration after the first therefore
   requested an unmatched path and returned 404. Demo jobs finish in about
   twenty milliseconds, so the loop almost never ran and the defect stayed
   hidden. **A real run, where every job takes minutes, would have failed at the
   first action.** `Get Job` now reads `$json.jobId || $json.id` and retries
   three times. The validator asserts both.

This defect predates this pass. It means no real run could ever have completed.

### Also corrected

`bin/import-workflows.sh` now activates both workflows and restarts n8n after an
import. An import writes `active=false` from the file, and n8n registers the form
webhook only at start-up, so a re-import used to leave the form returning 404.

## Not verified

1. The Claude engine has never executed a real action. Its flags come from
   `claude -h` on version 2.1.231 and its argument building is unit-tested, but
   no `claude -p` process has run through the runner. Use
   `PAYFLOW_ENGINE=claude npm run smoke:real` first. That smoke is read-only.
2. The Header Auth credential path is generated and validated but was not
   imported into the live instance.
3. The opt-in Task 01 real smoke has not run on either engine. No real action
   has run on any engine.

## Known limits

- The Claude engine has no filesystem sandbox. Codex confines a write action
  with `--sandbox workspace-write`; Claude Code has no equivalent. On the Claude
  engine the guards are the throwaway clone, `--disallowed-tools` for read-only
  roles, and the post-run Git ownership check.
- `security-reviewer` exists in neither `.claude/agents/` nor `.codex/agents/`,
  so the security-review nodes are unreachable in practice. This is correct
  behaviour: the canonical workflow requires that a missing security review is
  shown as missing. The `missing-security-reviewer` demo scenario is therefore
  an alias for `happy-path`.
- A real run clones `PAYFLOW_REMOTE_URL`. Local uncommitted work is invisible to
  it. Push the base branch before a real run.
- A resume into a blocked run returns 409 from the submit node, which ends the
  execution. The **Action failed** form warns about this and offers stop.
