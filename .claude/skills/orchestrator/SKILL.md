---
name: orchestrator
description: Run the gated PayFlow feature workflow for a numbered task.
---

Use `/orchestrator NN`, where `NN` is the task number, for example `01` or
`04`.

Run the workflow in this file. Do not create feature artifacts, code, or tests.
The named skill, command, or subagent owns each output. You control sequence,
handoffs, and human gates.

# Required limits

- Stop at all seven human gates, unless the human explicitly waives the rest of gate 5.
- Do not decide at a gate for the human.
- Do not run `git commit`, `git push`, or `gh pr create`.

# Before the workflow

1. Read `docs/tasks/NN-*.md`. Get the branch from its `**Branch:**` line. Read
   the final **Note**. Report the Note at gate 1 when it is relevant.
2. Check `.claude/skills/business-analyst/SKILL.md` and `.claude/skills/architect/SKILL.md`. If either is missing, name it, refer to Task 00, and stop.
3. Run `git rev-parse --abbrev-ref HEAD`.
   - If it is the task branch, continue.
   - If it is `main` or another branch, ask before you use git.
   - Offer three choices: create the task branch from `main`; use the current
     branch; or stop.
   - Do not change branches without permission.
4. List `docs/features/NN/`. Report each existing feature artifact. Ask where
   to resume. Do not overwrite a human-edited artifact without instruction.

# Workflow

This workflow has 10 phases. Report one short block at a result, gate, or
blocker. Do not report routine tool calls. Do not copy whole documents into
chat.

## 1. Acceptance criteria

Run `business-analyst NN`. It writes `docs/features/NN/NN-acceptance.md` and
reports counts for FRs, criteria, and open questions.

**GATE 1 — Are the acceptance criteria testable?** Show the count line, open
questions, and relevant task Note. Ask: “Can you name the test for every
criterion?” Stop for the answer.

## 2. ADR

Run `architect NN`. It writes `docs/features/NN/NN-adr.md` and reports a count
line.

**GATE 2 — Do you agree with the ADR?** Show the count line and every `Gap —`
line verbatim. Point to `implications for code`. Stop for the answer.

## 3. Plan request

Run `feature-kickoff NN`. It writes `docs/features/NN/NN-plan-request.md`.
Pass its interpretations and untestable-criteria warnings to the human
verbatim. Include them at gate 3. Do not continue as if they did not exist.

## 4. Plan

Use the `Plan` subagent with exactly:

```
Plan the work in docs/features/NN/NN-plan-request.md
```

If it asks a question, ask the human. Do not answer for the human. Then run
`feature-plan NN`. It copies the plan to `docs/features/NN/NN-plan.md` and
reports the task count.

**GATE 3 — Is the plan concrete?** Show the task count and each task title.
Name the vaguest task. Offer this request:

```
Task N is too vague. Break it into concrete steps naming the files and
methods you will change.
```

If the human accepts, re-plan that task, run `feature-plan` again, and return
to this gate.

## 5. Coverage check

Run:

```
Use the spec-guardian subagent to check docs/features/NN/NN-plan.md against docs/features/NN/NN-acceptance.md
```

It returns a coverage table and `GO` or `NO-GO`.

**GATE 4 — Do you accept the verdict?** Show the verdict and each uncovered
criterion ID. On `NO-GO`, offer plan revision or stop. Do not first offer to
continue. The human can override this decision. Also offer the gate-5 waiver
now: state that the human can ask to skip the per-task diff gate and build the
remaining tasks in one run instead.

## 6. Build

Run one plan task at a time:

```
Use the implementer subagent to build task N of docs/features/NN/NN-plan.md
```

After each task, run `git diff --stat` and report it.

**GATE 5 — Read the diff.** Ask after each task. Offer: continue to the next
task; stop and inspect; or continue remaining tasks without another gate. If
accepted, state that gate 5 is waived for the remaining build tasks. Run the
remaining task range in one implementer invocation. Report one combined
diffstat when it returns.

If the implementer reports that the plan is wrong or refuses to continue, stop
and ask the human. Do not rewrite the plan.

## 7. Tests

Run:

```
Use the test-verifier subagent to verify task NN
```

It maps criteria to tests, writes missing tests, and runs `./verify.sh`.

**GATE 6 — Did the suite genuinely pass?** Report the criterion-to-test map and
the `verify.sh` result verbatim. Read `verify.sh` and state what it checked. If
it did not run unit tests, state what a pass means. A pass means the stack
started and the smoke test passed. It does not mean that the test suites
passed.

If `test-verifier` reports a production defect, stop and ask the human. Do not
weaken a test to force a pass.

## 8. Review

Run:

```
Use the code-reviewer subagent to review the diff for task NN
```

Check whether the current client has a `security-reviewer`.

- If it exists, run it in the same way.
- If it does not exist, say: “`security-reviewer` is not written. No security review has run.” Ask whether to continue without it.

**GATE 7 — Which findings are you fixing?** Show every finding as written:
severity, `file:line`, finding, and remediation. Do not change severity or
lower a HIGH finding to a lower severity. Offer: all HIGH and MEDIUM; HIGH
only; include LOW; or select individual findings. If both reviewers have no
findings, say so and go to phase 10.

## 9. Fix and verify again

Run:

```
Use the implementer subagent to fix every HIGH and MEDIUM finding above. Change nothing else.
```

Name the selected findings. Run `test-verifier` again. If the suite does not
pass, return to gate 6.

## 10. Close

Run `feature-close NN`. It writes `docs/features/NN/NN-PR.md`, updates
acceptance evidence, and suggests git commands. If it stops, report its reason
and stop. Do not bypass its preconditions.

Show the suggested git commands. State that the human must run them.

# Failure rules

- If a skill or subagent stops for a precondition, report the condition and stop. Satisfy it correctly; do not bypass it.
- If a step fails twice in the same way, stop and report it. Do not retry a third time.
- If the human stops at a gate, state the gate, file to edit, and that `/orchestrator NN` resumes from there. Keep existing artifacts.

# Final check

Before completion, report whether:

- all seven gates occurred, or the human waived remaining gate-5 checks;
- only the owning skills or agents created artifacts;
- no commit, push, or PR command ran;
- `docs/features/NN/` contains acceptance, ADR, plan request, plan, and PR;
- the diff changes database, backend, and frontend; and
- you stated what `verify.sh` checked, not only that it passed.
