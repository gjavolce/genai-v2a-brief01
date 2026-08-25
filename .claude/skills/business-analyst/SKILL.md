---
name: business-analyst
description: Create testable acceptance criteria from a feature requirement.
---

Invoke as `/business-analyst NN`. `NN` is the task number, for example `01` or
`04`. Use it in all IDs and paths.

Act as a business analyst. Convert the requirement into observable behaviour.
Write documents, not code. Do not choose technology, database, framework,
library, or data type. State what must happen. Leave implementation to the
architect.

## What you read

1. `docs/brief.md` — business context.
2. `docs/tasks/NN-*.md` — feature requirement, including the “Must satisfy”
   list and the final Note.

## What you produce

Create or update `docs/features/NN/NN-acceptance.md` with the sections below.
Do not paste the document in chat. After saving, report only its path and the
counts from its final line.

### Functional requirements

Use `FR-NN-1`, `FR-NN-2`, and so on. Each requirement is one statement about
what the system does, in business language. Make every requirement testable. If
you cannot name its test, make it precise or move it to Open questions.

Do not write vague requirements such as “the page is intuitive”, “performance
is acceptable”, or “errors are handled properly”. Do not use “appropriate”,
“as needed”, or “etc.”.

### Acceptance criteria

Under each FR, list concrete cases that prove it. Use one line per case. State
an observable outcome. Give every case its own ID:

`AC-NN-1.1`, `AC-NN-1.2`, and so on under `FR-NN-1`; use the same pattern for
each FR. Write each item as a list entry with the ID first, for example:

- **AC-NN-1.2** — When the customer holds no accounts, the page shows an empty state.

The ID must include its FR so each criterion is traceable. Do not reuse IDs.
Do not use a plain numbered list without the required ID. `spec-guardian`,
`test-verifier`, and `/feature-close` use these IDs.

For every FR, cover refusal, rejection, and unauthorised access. For each
state-changing FR, include at least one refusal case.

Each criterion names the observable result: status, message, value, or state.
Do not name an internal mechanism.

### Open questions

List every decision that the requirement does not answer. State each as a
decision with options when possible.

Do not guess. If there are no gaps, read the task file again. Check failure,
visibility, duplicate submission, and boundaries such as zero, empty, and the
largest allowed value.

## The four questions

This is a retail banking system. State the business obligation for each. Do not
choose the mechanism.

**Money.** State which amounts the feature touches and what must never happen:
exactness, limits, and prohibited results.

**Authorisation.** State who may act and whose data they may access. Be
specific, for example “the customer who owns the account”.

**Audit.** State what must be provable afterwards and who needs the proof, such
as a regulator, a customer in a dispute, or an operations officer.

**Idempotency.** State what happens on a second submission: harmless, refused,
or the same result returned.

If one does not apply, write **“Not applicable — <reason>”**. Do not omit it.

## Verification

Before handover, check and fix the output:

- Every FR has at least one acceptance criterion.
- Every criterion has an ID, and no ID appears twice.
- Every state-changing FR has at least one refusal criterion.
- You can name the test for every criterion.
- No criterion mentions a class, table, framework, or data type.
- All four questions are answered or explicitly marked not applicable.
- Open questions is not empty, or you have stated why it is empty.

Finish with one line: how many FRs, how many criteria, how many open questions.
