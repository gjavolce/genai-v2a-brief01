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
4. Open Claude Code. Run **`/agents`** — expect **4 subagents**. Type **`/`** —
   expect **3 commands**. Two more appear after Task 00.
5. Open `docs/TASKS.md`.

Anything missing, say so now — not at 14:00.

## What's here, and what isn't

**Here:** a working full-stack application (database → API → React), the business
brief, eleven tasks, four subagents, and three slash commands.

**Not here:** acceptance criteria, functional requirements, non-functional
requirements, architecture decisions. Producing those is the job, and **Task 00**
has you build the two skills that do it.

## The loop — every feature, start to finish

From `main`, with Task 00 done. Example uses task 04. Once you've done it
once, `flow.md` is this whole section as one table.

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

**3.** `/business-analyst 04` → `docs/features/04/04-acceptance.md`

**4. 🚦 Read it. Edit it.** The gate most often skipped, and the one that decides
the feature. Every agent below is judged against this document — a vague
criterion produces a plan that gets confidently approved and a feature that's
wrong. For each criterion ask: *can I name the test?* If not, rewrite it by hand.

**5.** `/architect 04` → `docs/features/04/04-adr.md`

It reads your acceptance criteria first and refuses to run without them.

**6. 🚦 Read it** — especially **implications for code**, which is what
`code-reviewer` will hold your implementation against. Disagree with a decision?
Change it. It's your ADR.

```bash
git add docs/features/04 && git commit -m "docs(04): acceptance criteria and ADR"
```

### C · Plan

**7.** `/feature-kickoff 04` → `docs/features/04/04-plan-request.md`, quoting
your criteria and ADR.

**8. Plan mode.** Press **Shift+Tab** until the footer says plan mode is on,
then hand it the request rather than retyping its contents:

```
Plan the work in @docs/features/04/04-plan-request.md
```

**It will ask you something.** Answer properly; a clarifying question from the
planner is usually worth more than the code it's about to write.

**9.** `/feature-plan 04` → `docs/features/04/04-plan.md`. Plan mode cannot
write files — that is the point of it — so the plan lives only in the
conversation; this writes it out unchanged. Run it in the **same session**, or
there is no plan to write. Every agent below reads it from that path; a plan
left in the chat is one nobody can review, diff or commit.

**10. 🚦 Read the plan.** Find the vaguest task — there's always one:

```
Task 3 is too vague. Break it into concrete steps naming the files and
methods you'll change.
```

### D · Build — the agent chain

**11.** Hand it to `spec-guardian`. Its tools are `Read, Grep, Glob`, so it
opens the files itself — nothing to attach:

```
Use the spec-guardian subagent to check docs/features/04/04-plan.md against docs/features/04/04-acceptance.md
```

**12. 🚦 GO or NO-GO.** Do not proceed on NO-GO — you'll build the wrong thing
for twenty minutes and find out at the reviewers.

**13.** On GO, type the line `spec-guardian` printed. `implementer` writes the
migration, the backend and the React page.

```
Use the implementer subagent to build docs/features/04/04-plan.md
```

**14. 🚦 Read the diff.** Read, not skim. This is the rule for the whole day.

**15.** `test-verifier` covers any untested criterion, then runs `./verify.sh`.

```
Use the test-verifier subagent to verify task 04
```

**16. 🚦 Wait for green.** If a test fails because the *implementation* is wrong,
it hands back to `implementer` — it will not weaken a test to make it pass.

**17.**

```
Use the code-reviewer subagent to review the diff for task 04
```

**18.**

```
Use the security-reviewer subagent to review the diff for task 04
```

You have to write that one yourself — a later task.

**19. 🚦 Read both sets of findings**, then type the line `code-reviewer`
printed. Fix HIGH and MEDIUM. Leave LOW unless it's free.

```
Use the implementer subagent to fix every HIGH and MEDIUM finding above. Change nothing else.
```

**20. Re-run `test-verifier`** — confirm still green after the fixes.

### E · Close

**21.** `/feature-close 04` → `04-PR.md`, criteria ticked, commands supplied.
It refuses if `verify.sh` is red, if HIGH findings remain, if you're on `main`,
or if the diff doesn't touch all three layers.

**22.**

```bash
git add -A && git commit -m "feat(04): transfer between own accounts"
git push -u origin feature/04-internal-transfer
gh pr create --fill
```

**23.** `git checkout main && git merge feature/04-internal-transfer` → next task.

## What you actually type

Five slash commands, one mode switch, six subagent hand-offs. No buttons —
every step is something you type, which is the point.

```
/business-analyst 04
/architect 04
/feature-kickoff 04
[Shift+Tab]  Plan the work in @docs/features/04/04-plan-request.md
/feature-plan 04
Use the spec-guardian subagent to check …/04-plan.md against …/04-acceptance.md
Use the implementer subagent to build docs/features/04/04-plan.md
Use the test-verifier subagent to verify task 04
Use the code-reviewer subagent to review the diff for task 04
Use the security-reviewer subagent to review the diff for task 04
Use the implementer subagent to fix every HIGH and MEDIUM finding above
/feature-close 04
```

Each agent ends by printing the next line for you. Copy it — or don't, if you
disagree with the verdict. Nothing runs until you send it.

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

## Your four subagents

They live in `.claude/agents/`. Run `/agents` to see them.

| Subagent | `tools:` | Does |
|---|---|---|
| `spec-guardian` | `Read, Grep, Glob` | Checks the plan covers every acceptance criterion |
| `implementer` | `Read, Write, Edit, Grep, Glob, Bash` | Builds exactly the plan, no scope creep |
| `test-verifier` | `Read, Write, Edit, Grep, Glob, Bash` | Covers criteria, drives `./verify.sh` green |
| `code-reviewer` | `Read, Grep, Glob, Bash` | Conventions, ADR compliance, scope drift |

Three of the five cannot write a byte. That isn't a promise — it's their `tools:`
list, and a tool that isn't listed cannot be called. The fifth,
`security-reviewer`, you'll write yourself.

`test-verifier` is the exception worth understanding: it *can* write anywhere,
and is told not to touch `src/main`. That boundary is prose, not enforcement —
which is exactly why you read the diff.

## Definition of done, every feature

> acceptance criteria and ADR reviewed · spec-guardian **GO** · every acceptance
> criterion has a passing test · `./verify.sh` green · zero HIGH findings ·
> database, backend **and** frontend all changed · committed on its own branch

## Stuck?

| Symptom | Fix |
|---|---|
| `/agents` shows nothing | Files must be `.claude/agents/<name>.md`, with `name:` in the frontmatter matching the filename. Restart Claude Code. |
| A skill isn't in the `/` picker | `name:` in `SKILL.md` must match its directory name **exactly**. Restart Claude Code. |
| `verify.sh` red | Read the one line naming the failing step. Don't retry the same command hoping. |
| Page loads, but `Could not load customers: The API returned 500` | The `backend` container isn't up. `docker compose ps` to check, `docker compose logs backend` to see why, `docker compose up -d backend` to restart it. |
| MySQL unreachable | `docker compose ps` — is `mysql` healthy? If it's not running at all, `docker compose up --build`. |
| A subagent edited something it shouldn't | Check its `tools:` list, then `git checkout` the file. Being wrong is cheap; not looking is expensive. |
| Plan mode won't write the plan out | Correct — it can't. That is what `/feature-plan NN` is for. Run it in the same session. |
| `/architect` refuses to run | You skipped `/business-analyst`. That's deliberate. |
