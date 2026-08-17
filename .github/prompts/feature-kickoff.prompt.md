---
mode: ask
description: Draft a plan request for a feature, ready to paste into /plan
---

# Task

Produce a plan request for task ${input:task:Which task? e.g. 01}, ready for me
to paste straight into `/plan`.

Do **not** write the plan. Do not write code. You are drafting the request.

# Read first, in this order

1. `docs/tasks/${input:task}-*.md` — the business requirement
2. `docs/features/${input:task}/acceptance.md` — functional requirements and
   acceptance criteria, from `/business-analyst`
3. `docs/features/${input:task}/adr.md` — decisions, non-functional requirements
   and rules for code, from `/architect`
4. `api/src/main/java/**/customer/**` — the reference slice, for the conventions
   this codebase already follows

**If either file under `docs/features/${input:task}/` is missing, stop.** Say
which one, and tell me to run `/business-analyst ${input:task}` or
`/architect ${input:task}` first. Do not improvise the missing content — those
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

# Expected output

A single fenced code block, ready to copy. Plain prose inside it, no markdown
headings — it is going into a chat input, not a document.

Under the block, list anything you had to interpret, and anything in
`acceptance.md` that looked untestable. Flag it now so I can fix the document
before planning starts rather than after implementation.

# Verification

- Every acceptance criterion appears, word for word.
- The out-of-scope list is not empty.
- The ADR is cited by name and its code rules are quoted.
- All three layers are named.
- Banking obligations are addressed explicitly, not skipped.
- The block stands alone — someone who has read none of the docs could act on it.
