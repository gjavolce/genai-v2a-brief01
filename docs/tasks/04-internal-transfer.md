# Task 04 — Transfer between my own accounts

**Branch:** `feature/04-internal-transfer` · **Depends on:** Task 01 · **~30 min**

## The requirement

A customer with a current account and a savings account wants to move money
between them without calling us. This is the most common request the contact
centre gets.

An account may not go overdrawn. If the transfer would do that, it must not
happen at all.

## Must satisfy

1. Money leaves one account and arrives in the other — both, or neither. There
   is no state in which one side happened.
2. A transfer that would overdraw the source is refused and moves nothing.
3. A transfer involving an account the customer doesn't own is refused and moves
   nothing.

## Full stack

- **Database** — a transfer record, and both balances updated.
- **Backend** — the transfer, transactional.
- **Frontend** — a form, and the new balances afterwards.

## Note

**This is the first feature that moves money.** Everything the reviewer agents
care about starts here — the transaction boundary, the audit record, the
ownership check on *both* accounts, and how you compare two monetary values.

That last one has a trap in it. Find it before `code-reviewer` does.
