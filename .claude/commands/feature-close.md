---
description: Prepare close-out documents for a reviewed feature.
argument-hint: <task-number, e.g. 01>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Task

Close task `$1` after the review chain passes.

# Preconditions

Stop if any condition is false. State the failed condition.

- `./verify.sh` is green.
- `code-reviewer` has no HIGH finding.
- If the current client has a `security-reviewer`, it has no HIGH finding.
- If no security reviewer exists, state that no security review ran.
- Ask the user whether to continue without the security review.
- Do not treat a missing review as a passing review.
- The branch is `feature/$1-*`, not `main`.
- The diff changes database, backend, and frontend.

# Rules

- Use `docs/features/$1/$1-plan.md` as the PR description source.
- Do not reconstruct the PR description from the diff.
- Modify only `docs/features/$1/$1-PR.md` and
  `docs/features/$1/$1-acceptance.md`.
- Do not modify `api/src/main/**` or `web/src/**`.
- This is a documentation step.
- Suggest git commands, but never run `git commit`, `git push`, or `gh pr create`.

# Output

1. Write `docs/features/$1/$1-PR.md` with this structure:

   ```markdown
   ## Task $1 — <title>

   ### What
   One paragraph about the capability, not its implementation.

   ### Why
   The business requirement and satisfied functional requirements.

   ### How
   Bullets from the plan task list. Name the ADR.

   ### Layers changed
   Database · Backend · Frontend — one line each that names files.

   ### Testing
   Map tests to acceptance criteria. Confirm `./verify.sh` is green.

   ### Review findings
   State reviewer findings and their resolution. Use `Clean` when applicable.

   ### Not included
   State excluded work, reasons, and noticed but unfixed items.
   ```

2. Update `docs/features/$1/$1-acceptance.md`. Tick each criterion with a
   passing test. Use the criterion ID and name the test. Record each criterion
   change and its reason.

3. Suggest a conventional commit message. Put the task number in the subject.
   Suggest push and PR commands for this branch. Do not run them.

4. Report items that change assumptions for the next task.

# Verify

- State when `./verify.sh` was green.
- Every criterion is ticked or explicitly explained.
- The PR document names all three layers.
- `Not included` is complete and accurate.
- No file in `api/src/main/**` or `web/src/**` changed.
