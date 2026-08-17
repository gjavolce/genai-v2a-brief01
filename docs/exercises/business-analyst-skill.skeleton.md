<!--
  TASK 00, PART A · copy to .github/skills/business-analyst/SKILL.md and complete.
  Fill every << ... >>. Delete these comments.
  The files in .github/prompts/ are good examples of tone — read one first.
-->
---
name: business-analyst

# This is how Copilot decides when to reach for the skill, and what you read in
# the picker at 3pm having forgotten what you built. Say what it does and when.
description: << ... >>

argument-hint: task number, e.g. 01
---

<< One or two lines. What role is this? You are a business analyst turning a
   client's requirement into testable behaviour. State plainly that you write
   documents, not code — and that you never choose a technology. >>

## What you read

<< Which files, and in what order? docs/brief.md for context, the matching
   docs/tasks/NN-*.md for this feature. Anything else? >>

## What you produce

`docs/features/${input:task}/acceptance.md`, containing:

### Functional requirements

<< Define the format. FR-NN-1, FR-NN-2… Each one a single statement about what
   the system does, in business language.

   State the bar: every requirement must be testable. Give the skill a rule for
   rejecting its own weak output — what does an untestable requirement look
   like, and what should it do when it writes one? >>

### Acceptance criteria

<< For each FR, the concrete cases that prove it. Decide the format — plain
   statements, or Given/When/Then.

   The important instruction: demand the unhappy paths. What is refused, what
   is rejected, what someone is not allowed to do. A feature with only
   happy-path criteria is untested, and this is where most of them get missed. >>

### Open questions

<< What the requirement doesn't answer. Tell the skill not to guess and continue
   — it should surface the question. What makes a good open question rather
   than a vague worry? >>

## The four questions

<< This is retail banking. Write the checks that force these to be answered from
   the business side. You are not choosing mechanisms — you are stating
   obligations.

   1. Money — which amounts matter, and what must never happen to them?
   2. Authorisation — who may do this, to whose data?
   3. Audit — what must we be able to prove afterwards?
   4. Idempotency — what should happen if this is submitted twice?

   If a feature genuinely doesn't touch one, the document must say so. Silence
   and "not applicable" look the same and mean different things. >>

## Verification

<< How does the skill check its own output before handing it back? Which of the
   rules above can it verify itself? This section earns its keep — it turns
   roughly one revision round into zero. >>

<!--
  DONE WHEN
  ✅ /business-analyst is in the slash picker
  ✅ /business-analyst 01 writes docs/features/01/acceptance.md
  ✅ every FR is testable — you can name the test
  ✅ unhappy paths are covered, not just happy ones
  ✅ the four questions are answered, not skipped
-->
