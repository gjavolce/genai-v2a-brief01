# Task 05 — Manage payees

**Branch:** `feature/05-payees` · **Depends on:** Task 01 · **~25 min**

## The requirement

Before a customer can pay someone else, we need to know who that someone is.
Customers keep a list of people they pay — a name they recognise, plus the sort
code and account number.

They add to the list, look at it, and remove from it. They do not edit entries:
a changed account number is a new payee, because silently redirecting a payment
to a different account is precisely the fraud we are trying to avoid.

## Must satisfy

1. A payee is created against the customer who created it, and sort code and
   account number are checked for shape before being stored.
2. A customer sees their own payees and nobody else's, and not in full.
3. Deleting works, and deleting someone else's payee does not.

## Full stack

- **Database** — payees belong to a customer.
- **Backend** — create, list, delete. No update.
- **Frontend** — the list, an add form, a delete action.
