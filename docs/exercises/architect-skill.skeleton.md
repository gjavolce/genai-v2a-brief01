<!--
  TASK 00, PART B · copy to .claude/skills/architect/SKILL.md and complete.
  Fill every << ... >>. Delete these comments.
  You've just built business-analyst — this is the same shape. Reuse what worked.
-->
---
name: architect

# How Claude decides when to reach for this, and what you read in the picker
# later. Say what it does and when — including that it runs AFTER the analyst.
description: << ... >>

argument-hint: task number, e.g. 01
---

<< One or two lines. You are an architect deciding what a set of acceptance
   criteria forces technically. State plainly: you write documents, not code —
   and you never invent a business rule. If a requirement is missing, that is
   the analyst's gap to fill, not yours to guess. >>

## What you read

<< In order: docs/brief.md · docs/tasks/NN-*.md ·
   docs/features/NN/NN-acceptance.md
   (the analyst's output — this is your input, do not proceed without it) ·
   every existing docs/features/*/*-adr.md, so you know what has already been
   decided. >>

## What you produce

`docs/features/NN/NN-adr.md`, containing:

### The decision(s)

<< Define the structure. At minimum: Context — what forces this, citing an FR.
   Options considered — at least two, honestly. A straw man means you haven't
   found the real decision; give the skill a rule for detecting that.
   Decision. Consequences — including at least one genuine downside, because an
   ADR with no cost is marketing.
   Implications for code — concrete rules, imperative voice. This is the section
   code-reviewer checks the implementation against, so it must read as
   instructions rather than prose.

   Also decide: what happens when an earlier ADR already covers this feature?
   Duplicated decisions are how an ADR set becomes worthless. >>

### Non-functional requirements

<< Format: NFR-NN-1, NFR-NN-2… The qualities that must hold rather than the
   behaviours that must happen — precision, auditability, authorisation,
   idempotency, performance.

   Same bar as the analyst's: testable, or it isn't a requirement. >>

## The four questions

<< You answer these from the technical side. The analyst has already stated the
   obligation; you choose the mechanism and write it down as a rule.

   1. Money — which type, what scale, what rounding, how are two amounts compared?
   2. Authorisation — where does the check live, and what does it throw?
   3. Audit — what is recorded, and in which transaction boundary?
   4. Idempotency — what mechanism, and what happens on a replay?

   If the acceptance criteria are silent where they shouldn't be, say so rather
   than inventing the business rule yourself. >>

## Verification

<< How does the skill check itself before handing back? Consider: does every
   decision trace to an FR? Does every option have a real trade-off? Is there a
   downside in the consequences? Does the implications section read as
   instructions a developer could follow without you? >>

<!--
  DONE WHEN
  ✅ /architect is in the slash picker
  ✅ /architect 01 writes docs/features/01/01-adr.md
  ✅ it reads acceptance.md first and refuses to run without it
  ✅ two real options, not one and a straw man
  ✅ consequences include a genuine downside
  ✅ implications-for-code reads as rules, not prose
  ✅ it references an existing ADR rather than duplicating one
-->
