---
mode: agent
description: Close out a finished feature — PR description, progress, commit
---

# Task

Task ${input:task:Which task? e.g. 01} has passed the review chain. Close it out.

# Stop first if any of these are untrue

- `./verify.sh` is green
- `code-reviewer` and `security-reviewer` both report zero HIGH findings
- the working branch is `feature/${input:task}-*`, not `main`
- the diff touches the database, the backend **and** the frontend

If any fails, say which and stop. Closing out a red feature is how a broken
build reaches the next person — and on `main`, how it reaches everyone.

# Constraints

- The PR description comes from `plan.md`, which already holds the why and the
  what. Do not reconstruct it from the diff; the plan is the better source.
- Do not modify anything under `src/main`. This step is documentation only.

# Expected output

**1. `docs/features/${input:task}/PR.md`**

```markdown
## Task ${input:task} — <title>

### What
One paragraph. The capability, not the implementation.

### Why
The business requirement, and the FRs it satisfies.

### How
Bullets from the plan's task list. Name the ADR this change follows.

### Layers changed
Database · Backend · Frontend — one line each, naming files.

### Testing
Which tests prove which acceptance criterion. Confirm ./verify.sh green.

### Review findings
What the reviewers raised and how it was resolved. "Clean" is a legitimate
and useful entry.

### Not included
What was deliberately left out, and why. Anything noticed but not fixed.
```

**2. Update `docs/features/${input:task}/acceptance.md`** — tick each criterion
that now has a passing test. If any criterion changed during implementation,
record the change and the reason. Criteria drift is normal; undocumented drift
is not.

**3. Suggest the git commands** — a conventional-commit message with the task
number in the subject, then the push and PR commands for this branch. Do not run
them; I will.

**4. Report readiness for the next task** — anything discovered here that
changes the next feature's assumptions. This is the most valuable line in the
output and the easiest to skip.

# Verification

- `./verify.sh` was green when you checked. Say when.
- Every acceptance criterion is ticked or explicitly explained.
- All three layers appear under "Layers changed".
- "Not included" is honest — it should list what you noticed and chose not to fix.
- Nothing under `src/main` was modified by this step.
