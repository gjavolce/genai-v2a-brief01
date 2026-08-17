# Task 09 — Standing orders

**Branch:** `feature/09-standing-orders` · **Depends on:** Task 06 · **~35 min**

## The requirement

Rent, subscriptions, money to a family member — customers want a payment that
repeats monthly on a day they choose, without them doing anything.

Something has to run these when they fall due. That something will occasionally
run twice: a redeploy, a retry, two instances. The customer must not pay their
rent twice because of our infrastructure.

## Must satisfy

1. A customer can set up a monthly order — source account, payee, amount, day of
   month, optional end date — and can list, amend and cancel it.
2. Orders due today execute automatically, and **exactly once per due date**,
   even if the process that runs them runs twice.
3. An order that can't be paid because funds are short fails for that date only,
   is recorded as such, and still runs next month.

## Full stack

- **Database** — the order, and its execution history.
- **Backend** — creation and management, plus the scheduled execution.
- **Frontend** — list, create, cancel, and the history of what has been paid.

## Note

The hardest feature here, and requirement 2 is why. Also decide what the 31st
means in February — pick a rule, write it in the ADR, and test it.
