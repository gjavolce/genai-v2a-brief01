# PayFlow — Retail Payments

You are building a web application for a UK bank: customers see their accounts,
move money, and set up regular payments. It already runs — your job is to extend
it, one feature at a time.

## First five minutes

1. **`docker compose up --build`** — starts three containers: `mysql`,
   `backend` (API → port 8080), `frontend` (web → port 5173). Leave it running
   in its own terminal. `api/` and `web/` are bind-mounted into their
   containers, so your edits take effect live — no rebuild needed.
2. In another terminal: `./verify.sh` — everything should be green.
3. Open **http://localhost:5173**. You should see a list of customers, served
   from a real database. That's your baseline.
4. Open the Chat view. Check the **agent picker shows 4 agents**, and typing `/`
   shows **2 commands**. Two more appear after Task 00.
5. Open `docs/TASKS.md`.

Anything missing, say so now — not at 14:00.

## What's here, and what isn't

**Here:** a working full-stack application (database → API → React), the business
brief, eleven tasks, four agents, and two slash commands.

**Not here:** acceptance criteria, functional requirements, non-functional
requirements, architecture decisions. Producing those is the job, and **Task 00**
has you build the two skills that do it.

## The loop — every feature, start to finish

From `main`, with Task 00 done. Example uses task 04.

### A · Start

**1. Read the task** — `docs/tasks/04-internal-transfer.md`. The requirement,
three "must satisfy" outcomes, the layers that change. Read the **Note** at the
bottom; several tasks point at a trap there.

**2. Branch.** The name is at the top of the task file.

```bash
git checkout main && git pull
git checkout -b feature/04-internal-transfer
```

### B · Decide — your two skills

**3.** `/business-analyst 04` → `docs/features/04/acceptance.md`

**4. 🚦 Read it. Edit it.** The gate most often skipped, and the one that decides
the feature. Every agent below is judged against this document — a vague
criterion produces a plan that gets confidently approved and a feature that's
wrong. For each criterion ask: *can I name the test?* If not, rewrite it by hand.

**5.** `/architect 04` → `docs/features/04/adr.md`

It reads your acceptance criteria first and refuses to run without them.

**6. 🚦 Read it** — especially **implications for code**, which is what
`code-reviewer` will hold your implementation against. Disagree with a decision?
Change it. It's your ADR.

```bash
git add docs/features/04 && git commit -m "docs(04): acceptance criteria and ADR"
```

### C · Plan

**7.** `/feature-kickoff 04` → a paste-ready block quoting your criteria and ADR.

**8.** `/plan <paste>` — **it will ask you something.** Answer properly; a
clarifying question from the planner is usually worth more than the code it's
about to write. Save the result as `plan.md`.

**9. 🚦 Read the plan.** Find the vaguest task — there's always one:

```
Task 3 is too vague. Break it into concrete steps naming the files and
methods you'll change.
```

### D · Build — the agent chain

**10. Select `spec-guardian`** in the picker:

```
Check plan.md for task 04 against docs/features/04/acceptance.md
```

**11. 🚦 GO or NO-GO.** Do not proceed on NO-GO — you'll build the wrong thing
for twenty minutes and find out at the reviewers.

**12. Click "Plan approved — implement"** → `implementer` writes migration,
backend, React page.

**13. 🚦 Read the diff.** Read, not skim. This is the rule for the whole day.

**14. Click "Verify with tests"** → `test-verifier` covers any untested criterion,
then runs `./verify.sh`.

**15. 🚦 Wait for green.** If a test fails because the *implementation* is wrong,
it hands back to `implementer` — it will not weaken a test to make it pass.

**16. Click "Green — send for review"** → `code-reviewer`.

**17. Select `security-reviewer`** and type `Review the diff for task 04`.
Manual, because you haven't built it yet — a later task.

**18. 🚦 Read both sets of findings**, then click **"Fix findings"** →
`implementer`. Fix HIGH and MEDIUM. Leave LOW unless it's free.

**19. Re-run `test-verifier`** — confirm still green after the fixes.

### E · Close

**20.** `/feature-close 04` → `PR.md`, criteria ticked, commands supplied. It
refuses if `verify.sh` is red, if HIGH findings remain, if you're on `main`, or
if the diff doesn't touch all three layers.

**21.**

```bash
git add -A && git commit -m "feat(04): transfer between own accounts"
git push -u origin feature/04-internal-transfer
gh pr create --fill
```

**22.** `git checkout main && git merge feature/04-internal-transfer` → next task.

## What you actually type

Four slash commands, two agent selections, four clicks.

```
/business-analyst 04
/architect 04
/feature-kickoff 04
/plan <paste>
[select] spec-guardian → "Check plan.md for task 04 against …/acceptance.md"
[click]  Plan approved — implement
[click]  Verify with tests
[click]  Green — send for review
[select] security-reviewer → "Review the diff for task 04"
[click]  Fix findings
/feature-close 04
```

## The seven gates

Every 🚦 is a point where **you** decide, not the tool:

1. Are the acceptance criteria testable?
2. Do I agree with the ADR?
3. Is the plan concrete?
4. Do I accept spec-guardian's verdict?
5. Have I read the diff?
6. Is it genuinely green?
7. Which findings am I fixing?

Skip all seven and you have a machine writing unreviewed code into a banking
system. **The gates are the job.** The agents are what make the job fast enough
to be worth doing.

## Your four agents

| Agent | Can it edit? | Does |
|---|---|---|
| `spec-guardian` | **No** | Checks the plan covers every acceptance criterion |
| `implementer` | Yes | Builds exactly the plan, no scope creep |
| `test-verifier` | Tests only | Covers criteria, drives `./verify.sh` green |
| `code-reviewer` | **No** | Conventions, ADR compliance, scope drift |

Three of the five cannot write a byte. That isn't a promise — it's their `tools:`
list. The fifth, `security-reviewer`, you'll write yourself.

## Definition of done, every feature

> `acceptance.md` and `adr.md` reviewed · spec-guardian **GO** · every acceptance
> criterion has a passing test · `./verify.sh` green · zero HIGH findings ·
> database, backend **and** frontend all changed · committed on its own branch

## Stuck?

| Symptom | Fix |
|---|---|
| Agent picker is empty | Files must be `.github/agents/<name>.agent.md`, `name:` matching the filename. Reload Window. |
| A skill isn't in the `/` picker | `name:` in `SKILL.md` must match its directory name **exactly**. Reload Window. |
| `verify.sh` red | Read the one line naming the failing step. Don't retry the same command hoping. |
| Page loads, but `Could not load customers: The API returned 500` | The `backend` container isn't up. `docker compose ps` to check, `docker compose logs backend` to see why, `docker compose up -d backend` to restart it. |
| MySQL unreachable | `docker compose ps` — is `mysql` healthy? If it's not running at all, `docker compose up --build`. |
| An agent edited something it shouldn't | Check its `tools:` list, then revert the checkpoint. Being wrong is cheap; not looking is expensive. |
| `/architect` refuses to run | You skipped `/business-analyst`. That's deliberate. |
