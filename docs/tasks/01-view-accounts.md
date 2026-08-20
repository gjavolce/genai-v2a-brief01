# Task 01 — View my accounts

**Branch:** `feature/01-view-accounts` · **Depends on:** Task 00 · **~25 min**

## The requirement

The application already knows who our customers are. It does not yet know that
they hold accounts.

A customer signing in wants to see, on one page, every account they hold with us
and how much is in each. Accounts have a name the customer recognises ("Everyday
Current"), an account number, a currency, and a balance.

## Must satisfy

1. A customer sees every account they own — and never one they don't, whatever
   is passed in the request.
2. Balances are exact. A balance that displays as `1234.5` or `1234.50000001` is
   a defect, not a formatting choice.
3. Account numbers are not shown in full.

## Full stack

- **Database** — accounts, belonging to the customers that already exist.
- **Backend** — a read endpoint returning the caller's accounts.
- **Frontend** — a page listing them with balances.

## Note

Deliberately small. Its job is to teach you the loop, not the domain. If it feels
trivial, that's correct — do it properly anyway, because the shape you establish
here is the shape every later feature copies, and so does Claude.
