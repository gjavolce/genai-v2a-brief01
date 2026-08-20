---
description: Write a feature's plan request to a file, ready to hand to plan mode
argument-hint: <task-number, e.g. 01>
allowed-tools: Read, Grep, Glob, Write
---

# Task

Write the plan request for task $1, ready for me to hand to plan mode.

Do **not** write the plan. Do not write code. You are writing the request, and
`docs/features/$1/$1-plan-request.md` is the only file you create.

# Read first, in this order

1. `docs/tasks/$1-*.md` — the business requirement
2. `docs/features/$1/$1-acceptance.md` — functional requirements and acceptance
   criteria, from `/business-analyst`
3. `docs/features/$1/$1-adr.md` — decisions, non-functional requirements and
   rules for code, from `/architect`
4. `api/src/main/java/**/customer/**` — the reference slice, for the conventions
   this codebase already follows

**If either file under `docs/features/$1/` is missing, stop.** Say
which one, and tell me to run `/business-analyst $1` or
`/architect $1` first. Do not improvise the missing content — those
documents are the contract everything downstream is judged against, and
inventing them here defeats the point.

# Constraints

A plan is only as good as its request. A vague request produces a plan that
looks fine and hides the decisions, which is worse than an obviously bad one
because it gets approved.

Include all six parts:

1. **What must exist when this is done** — the capability, one or two sentences.
2. **Scope** — which folders and layers are in. Then explicitly what is out. The
   "out" list matters more; it is what stops the agent wandering.
3. **Acceptance criteria** — copied **verbatim** from `acceptance.md`. Do not
   paraphrase or renumber. `spec-guardian` checks the plan against these exact
   words.
4. **Rules from the ADR** — the "implications for code" section, quoted. Cite
   the ADR by name.
5. **Full stack** — this feature must change the database, the backend and the
   frontend. Name what changes at each layer. A feature that stops at the API is
   not done.
6. **Banking obligations** — money, authorisation, audit, idempotency. State
   which apply and which explicitly do not.

# What you produce

`docs/features/$1/$1-plan-request.md` — the six parts
above, one `##` section each, in that order. The task number is in the filename
so you can pull it into plan mode with `@`.

Create or update this file in the workspace. Do not paste the plan request into
the chat instead of writing the file.

The file must stand alone: someone who has read none of the other documents can
act on it. It is the whole input to plan mode, so put nothing else in it — no
preamble to me, no notes about your own reasoning, no questions.

# Then report, in the chat only

- the path you wrote
- anything you had to interpret
- anything in `acceptance.md` that looked untestable

Those last two belong in the chat, not in the file — they are for me to fix in
`acceptance.md` before planning starts, rather than after implementation.

# Verification

- The file exists at `docs/features/$1/$1-plan-request.md`.
- Every acceptance criterion appears in it, word for word.
- The out-of-scope list is not empty.
- The ADR is cited by name and its code rules are quoted.
- All three layers are named.
- Banking obligations are addressed explicitly, not skipped.
- Nothing outside that one file was created or modified.
