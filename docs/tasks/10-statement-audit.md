# Task 10 — Statement export and audit search

**Branch:** `feature/10-statement-audit` · **Depends on:** Task 02 · **~30 min**

## The requirement

Two people need to answer "what actually happened". The customer wants a
statement for their records or their accountant. Operations need to reconstruct
the life of a payment when a customer disputes it.

Both are regulatory obligations, not conveniences.

## Must satisfy

1. A customer downloads a statement for one account and a date range, as a file
   they can open in a spreadsheet. Account numbers appear in it the same way
   they appear everywhere else.
2. An operations officer can search the trail of who did what, by account, by
   date and by actor. A customer calling the same endpoint cannot.
3. Nothing can alter an audit record after it is written — and there is a test
   that proves it, not just an absent endpoint.

## Full stack

- **Database** — audit search that doesn't scan the world.
- **Backend** — statement generation, and audit search restricted to operations.
- **Frontend** — a download button, and an operations search page.

## Note

Downloading a statement is itself an event worth recording. Consider whether
your audit trail records the reading of the audit trail.
