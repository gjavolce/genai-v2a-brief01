# Task 06 — Pay a payee

**Branch:** `feature/06-external-payment` · **Depends on:** Tasks 04, 05 · **~30 min**

## The requirement

The point of the whole application: send money from one of my accounts to
someone on my payee list.

Payments go over networks that retry. Our operations team has seen duplicate
payments from other systems and will not accept one from this.

## Must satisfy

1. Money leaves the customer's account and a payment record exists showing where
   it went.
2. The same payment submitted twice moves money **once**. Not "usually once" —
   once.
3. A caller who omits whatever mechanism you chose for that guarantee is told so,
   rather than being quietly allowed through.

## Full stack

- **Database** — payments, and whatever your duplicate-prevention needs.
- **Backend** — the payment, transactional and idempotent.
- **Frontend** — pick payee, pick source account, enter amount, confirm.

## Note

Requirement 2 is the feature. Decide how you'll guarantee it in the ADR, before
you write code — retrofitting idempotency is painful and usually wrong.
