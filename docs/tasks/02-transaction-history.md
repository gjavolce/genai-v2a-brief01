# Task 02 — View transaction history

**Branch:** `feature/02-transaction-history` · **Depends on:** Task 01 · **~25 min**

## The requirement

Having seen a balance, the customer's next question is always "why is it that
number?". They need the list of what has gone in and out of an account, most
recent first.

Some accounts have years of history, so the whole list cannot come back at once.

## Must satisfy

1. Transactions come back newest first, in pages, with enough information for the
   page to show how many there are in total.
2. Asking for the transactions of an account you do not own fails — and fails in
   a way that doesn't reveal whether that account exists.
3. The page shows date, description, amount and the running balance.

## Full stack

- **Database** — transactions belong to an account and are never edited.
- **Backend** — paged read, scoped to the caller.
- **Frontend** — a transaction list with paging.
