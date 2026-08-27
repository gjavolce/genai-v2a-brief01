# Task 02 — Transaction History Implementation Plan

## Summary

Add immutable, account-scoped transaction history across MySQL, Spring Boot, and React. Use zero-based current-data paging, exact decimal strings, generic ownership failures, and URL-backed account selection so browser refresh reloads page `0`.

## Implementation Tasks

1. **Add the transaction schema, fixtures, and immutable persistence model.**
   - Create `V4__create_account_transaction.sql` with `account_id`, UTC `booked_at DATETIME(6)`, nonblank `VARCHAR(255)` description, signed `DECIMAL(19,8)` amount, after-transaction `DECIMAL(19,8)` running balance, account foreign key, description check, and `(account_id, booked_at DESC, id DESC)` index.
   - Seed more than 20 transactions for one account, leave one owned account empty, and include unrelated ownership, equal-time ordering, eight-decimal precision, and separate reversal examples.
   - Add an immutable `AccountTransaction` entity and `AccountTransactionRepository`. Use `Instant` and `BigDecimal`; do not use the scale-two `Money` type.
   - Configure JDBC/Hibernate persistence to treat timestamps as UTC.
   - Add Testcontainers coverage for Flyway, constraints, foreign keys, precision, ordering, paging totals, description rejection, and reversal immutability.
   - Covers AC-02-1.9–1.12, AC-02-2.1, AC-02-2.14, AC-02-4.1, and AC-02-4.4.

2. **Expose the owned, paged transaction-history API.**
   - Add `id` to `AccountDto`, `AccountMapper`, the account web type, and existing account tests.
   - Add `AccountRepository.findByIdAndCustomerId` for the single composite ownership check.
   - Add transaction item and page DTOs. Return items with ISO UTC booking time, description, signed amount string, after-transaction balance string, and account currency. Return page, size, total elements, and total pages.
   - Add a read-only transaction service. Validate the account ID and paging bounds before repository access. Default to page `0` and size `20`; accept sizes `1`–`100`.
   - Query with booking time descending and transaction ID descending. Use a fresh database query and count for every request.
   - Add `GET /api/customers/{customerId}/accounts/{accountId}/transactions`.
   - Return a fixed `400` validation payload for malformed identifiers or paging values. Return a fixed `404` payload with title `Not found` and detail `Account not found.` for unowned accounts, nonexistent accounts, and nonexistent selected customers. Do not include identifiers or path-dependent properties.
   - Expose no mutation endpoint and create no audit event.
   - Covers AC-02-1.1–1.4, AC-02-1.7–1.10, AC-02-2.1–2.8, AC-02-2.12, AC-02-2.14, AC-02-3.1–3.5, and AC-02-4.1–4.5.

3. **Build the transaction-history web experience.**
   - Add a typed transaction API client that preserves amount and balance values as strings.
   - Add an accessible “View history” action for each account. Store the selected customer and account IDs in URL query parameters without adding a router dependency. Keep the page number only in component state so refresh reloads page `0`.
   - Add loading, error, empty-history, list, total-count, and paging states. Clear prior rows when the account changes or a request fails.
   - Format booking times with `Intl.DateTimeFormat` using `en-GB`, `Europe/London`, and a 24-hour clock.
   - Format decimal strings without numeric conversion or rounding. Prefix the currency, keep at least two decimal places, trim only trailing zeros beyond the second place, and add `+`/`Credit` or `-`/`Debit`.
   - Wrap descriptions without truncation. Show Previous, Next, and `Page X of Y` only for multi-page results, with boundary controls disabled.
   - Covers AC-02-1.1–1.8, AC-02-1.12, AC-02-2.9–2.13, and AC-02-3.1–3.5.

4. **Complete acceptance-level verification.**
   - Add mapper, service, and MVC tests for DTO precision, validation-before-repository behavior, default and boundary paging, equal-time ordering, beyond-final pages, and the exact generic error contracts.
   - Add database-backed API tests that compare owned, unowned, nonexistent-account, and nonexistent-customer failures; verify current-data reads; verify successful and refused reads do not change transactions, balances, or audit rows; and confirm mutation methods return `405`.
   - Expand React tests for navigation, refresh-to-first-page, loading, empty and failed requests, paging controls, totals, London summer/winter times, credit/debit labels, precision formatting, and 255-character wrapping.
   - Run `api/./mvnw test`, `web/npm test`, `web/npm run build`, and `./verify.sh`.

## Public Interfaces

- Account response adds `id`.
- Transaction response item: `bookedAt`, `description`, `amount`, `runningBalance`, `currency`.
- Page response: `items`, `page`, `size`, `totalElements`, `totalPages`.
- History endpoint: `GET /api/customers/{customerId}/accounts/{accountId}/transactions?page={page}&size={size}`.
- Ownership failure: `404`, title `Not found`, detail `Account not found.`.
- Generic input failure: `400` with no transaction data.

## Assumptions

- Task 02 is the intended task; the referenced Task 04 plan request does not exist.
- The selected customer remains the demo caller context.
- `account_transaction` contains booked movements only; pending and declined attempts are not stored there.
- Reversals are independent signed rows and do not modify original rows.
- Task 02 adds no transaction write path, authentication system, or access-audit records.
