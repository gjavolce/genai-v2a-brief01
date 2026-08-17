# Task 07 — Enforce the daily payment limit

**Branch:** `feature/07-daily-limit` · **Depends on:** Task 06 · **~30 min**

## The requirement

If someone takes over a customer's account, the damage they can do in a day must
be bounded. Policy is £10,000 per customer per calendar day across external
payments.

Moving money between your own accounts is not a loss to the bank or the customer,
so it doesn't count.

## Must satisfy

1. A payment that would breach the daily total is refused, moves nothing, and
   tells the customer how much they have left.
2. Internal transfers don't consume the allowance.
3. The allowance resets at midnight.

## Full stack

- **Database** — how you total today's payments, efficiently.
- **Backend** — the check, before the money moves.
- **Frontend** — remaining allowance shown, and a clear refusal.

## Note

Two payments submitted at the same moment must not both see the same remaining
allowance and both pass. Think about that case explicitly — it is a genuine
race, not a theoretical one, and it is how limits get bypassed in the real world.
