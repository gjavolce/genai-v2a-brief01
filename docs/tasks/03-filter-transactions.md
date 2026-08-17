# Task 03 — Filter transaction history

**Branch:** `feature/03-filter-transactions` · **Depends on:** Task 02 · **~20 min**

## The requirement

"I know I paid the plumber in March" — customers look for a specific payment.
They need to narrow the list by date range and by whether money went in or out.

## Must satisfy

1. Date range and direction both filter the list, and work together.
2. A nonsensical range — start after end — is rejected with a message naming
   what's wrong.
3. Filters survive paging: going to page 2 keeps them.

## Full stack

- **Database** — indexing, if the query needs it.
- **Backend** — filter parameters on the existing endpoint.
- **Frontend** — filter controls that persist across pages.

## Note

Filter values go from an HTTP request into a database query. Think about what
that means before you write it, and expect `security-reviewer` to look.
