# Task 08 — Hold large payments for approval

**Branch:** `feature/08-approval` · **Depends on:** Task 06 · **~30 min**

## The requirement

Payments over £5,000 need a second pair of eyes. The customer submits; an
operations officer approves or rejects with a reason; only then does money move.

The person who raised a payment cannot be the person who approves it. That rule
exists because it is the one control that survives a single compromised or
dishonest actor.

## Must satisfy

1. A large payment is accepted, held, and moves no money until approved.
2. Approval moves the money. Rejection doesn't, and records why.
3. Nobody approves their own payment.

## Full stack

- **Database** — payment state, and who did what to it.
- **Backend** — approve and reject, restricted to operations.
- **Frontend** — a customer sees "awaiting approval"; operations get a queue.

## Note

Requirement 3 is an authorisation rule, not a validation rule. Where it lives in
your code matters, and `code-reviewer` has an opinion about it.
