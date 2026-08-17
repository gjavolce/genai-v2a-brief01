# Task 00 — Build the `business-analyst` and `architect` skills

**Branch:** `task/00-analysis-skills`
**Time:** ~30 minutes, two parts
**Finish this before Task 01.** Everything downstream uses both.

## Why two skills, not one

The repo gives you ten business requirements. It does not give you acceptance
criteria, functional requirements, non-functional requirements or architecture
decisions — because producing those is the job.

And it is two jobs, done by two people, in this order:

| | **Business analyst** | **Architect** |
|---|---|---|
| Asks | What must it do, and how will we know it's done? | What does that force us to decide? |
| Speaks | Business language | Technical language |
| Produces | Functional requirements, acceptance criteria | ADRs, non-functional requirements, code rules |
| Never | Chooses a technology | Invents a business rule |

Collapsing them is the most common failure in real projects: technical decisions
get made inside a requirements document, nobody notices, and there is no record
of why. Keeping them apart is why an ADR is worth writing at all.

You will build both as **skills**, because this is repetitive expert work you're
about to do ten times — which is exactly what a skill is for.

---

## Part A — `business-analyst` (~15 min)

**Goes at:** `.github/skills/business-analyst/SKILL.md`
**Start from:** `docs/exercises/business-analyst-skill.skeleton.md`

Given a task number, `/business-analyst NN` reads `docs/brief.md` and
`docs/tasks/NN-*.md` and writes **`docs/features/NN/acceptance.md`**:

- **Functional requirements** — `FR-NN-1`, `FR-NN-2`, … Each a single testable
  statement about behaviour. No technology words.
- **Acceptance criteria** — for each FR, the concrete cases that prove it,
  including the unhappy ones. "Rejects a transfer that would overdraw" is worth
  more than three happy-path criteria.
- **Open questions** — anything the requirement doesn't answer. Do not guess and
  move on; a business requirement with no gaps hasn't been read carefully.

---

## Part B — `architect` (~15 min)

**Goes at:** `.github/skills/architect/SKILL.md`
**Start from:** `docs/exercises/architect-skill.skeleton.md`

You've just built one skill. This is the same shape, so it should be faster.

Given a task number, `/architect NN` reads the brief, the task file, **the
acceptance criteria the business analyst just produced**, and any earlier ADRs
under `docs/features/*/adr.md`, then writes **`docs/features/NN/adr.md`**:

- **The decision(s)** this feature forces — context, at least two real options
  with honest trade-offs, the decision, consequences including a genuine
  downside, and **implications for code** as rules a developer can follow.
  If an earlier ADR already covers it, reference it rather than duplicating.
- **Non-functional requirements** — `NFR-NN-1`, … The qualities that must hold:
  precision, auditability, authorisation, idempotency, performance.

The "implications for code" section is what `code-reviewer` checks your
implementation against, so write it as instructions, not prose.

---

## This is a banking system

Both skills should force the same four questions — from their own side of the
line. A payments feature whose documents are silent on these is incomplete.

| | **business-analyst asks** | **architect decides** |
|---|---|---|
| **Money** | Which amounts matter, and what must never happen to them? | The type, scale and rounding. How two amounts are compared. |
| **Authorisation** | Who is allowed to do this, to whose data? | Where the check lives and what it throws. |
| **Audit** | What must we be able to prove afterwards? | What is recorded, and in which transaction. |
| **Idempotency** | What should happen if this is submitted twice? | The mechanism that guarantees it. |

If a feature genuinely doesn't touch one, the document should say so explicitly.
Silence and "not applicable" look identical on the page and mean very different
things.

## Done when

- [ ] `/business-analyst` and `/architect` both appear in the slash picker
- [ ] `/business-analyst 01` writes `docs/features/01/acceptance.md`
- [ ] `/architect 01` writes `docs/features/01/adr.md` and reads the acceptance
      criteria first
- [ ] Every FR is testable — you can name the test for each
- [ ] The ADR has two real options, not one and a straw man
- [ ] Neither document is silent on the four questions
- [ ] The architect references an existing ADR rather than duplicating a decision
- [ ] Committed on `task/00-analysis-skills`

Not done at 30 minutes? Ask your instructor for the reference versions, take
them, and start Task 01. You have features to build.
