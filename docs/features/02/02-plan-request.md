## What must exist when this is done

A customer can open an owned account and view its immutable transaction history
in newest-first pages with transaction details, running balances, and total
count. The implementation must protect ownership across the database, backend,
and frontend without revealing whether another account exists.

## Scope

In scope:

- Add the transaction schema, account relationship, exact monetary fields, stable paging index, and representative history under `api/src/main/resources/db/migration/`.
- Add the account route key and composite ownership lookup under `api/src/main/java/com/neueda/capstone/account/`.
- Add the transaction entity, repository, service, mapper, page DTO, item DTO, controller, and tests under `api/src/main/java/com/neueda/capstone/transaction/` and `api/src/test/`.
- Add the transaction API client, account-to-history navigation, transaction list, empty state, loading state, failure state, and paging under `web/src/`.
- Preserve exact amounts and running balances through all layers without binary floating-point conversion.
- Follow the existing customer slice: controllers handle HTTP, services own repository access and transaction boundaries, repositories scope stored data, and mappers isolate response DTOs.

Out of scope:

- Creating, editing, deleting, reversing, or otherwise changing transactions.
- Changing account balances or implementing any payment, transfer, standing order, or approval flow.
- Adding production authentication or operations-officer access; use the existing selected-customer demo context.
- Exposing or using full account numbers as route keys, response identifiers, or log values.
- Adding access-audit records for successful or refused history requests.
- Mobile support, international payments, currency conversion, direct debits, overdrafts, and account opening or closing.

## Acceptance criteria

- **AC-02-1.1** — When the account has transactions, the page shows each returned transaction with its date, description, amount, and running balance.
- **AC-02-1.2** — Each displayed date, description, amount, and running balance matches the recorded transaction.
- **AC-02-1.3** — When the account has no transactions, the page shows an empty-history state and does not show a transaction row.
- **AC-02-1.4** — When the account identifier is not a positive whole number within the supported range, the request returns `400 Bad Request` with a generic validation message and no transaction history.
- **AC-02-1.5** — Each transaction shows its booking date and time in the Europe/London time zone with the format `DD MMM YYYY, HH:mm`, for example `25 Aug 2026, 14:30`.
- **AC-02-1.6** — A credit shows a `Credit` label and a plus sign, and a debit shows a `Debit` label and a minus sign; the distinction does not depend on colour alone.
- **AC-02-1.7** — Each amount and running balance shows its three-letter currency code, at least two decimal places, and every additional recorded non-zero decimal digit up to eight places without rounding.
- **AC-02-1.8** — Each displayed running balance is the account balance immediately after the transaction.
- **AC-02-1.9** — The history shows booked transactions only and does not show pending or declined transactions.
- **AC-02-1.10** — A reversal appears as a separate booked transaction, and the original transaction remains unchanged in the history.
- **AC-02-1.11** — A transaction with a missing or blank description is refused and is not recorded in the history.
- **AC-02-1.12** — A description of up to `255` characters is shown in full and wraps instead of being truncated.
- **AC-02-2.1** — When transactions have different dates, each newer transaction appears before each older transaction.
- **AC-02-2.2** — When page and size are omitted, page `0` returns no more than `20` transactions and states the total number of transactions for the account.
- **AC-02-2.3** — When the customer requests the next page and the history has not changed, it continues the ordered history without a duplicate or omitted transaction.
- **AC-02-2.4** — When fewer transactions remain than the permitted page size, the final page contains only the remaining transactions.
- **AC-02-2.5** — When the account has no transactions, the total is zero.
- **AC-02-2.6** — When page is negative, size is less than `1`, or size is greater than `100`, the request returns `400 Bad Request` with a generic validation message and no transaction page.
- **AC-02-2.7** — When size is from `1` through `100`, the returned page contains no more than the requested number of transactions and states the total number of transactions for the account.
- **AC-02-2.8** — When the requested page is beyond the final page, the request returns `200 OK` with an empty transaction list and unchanged totals.
- **AC-02-2.9** — When transaction history has more than one page, the page shows Previous and Next controls and a `Page X of Y` indicator.
- **AC-02-2.10** — When the customer is on the first page, the Previous control is disabled.
- **AC-02-2.11** — When the customer is on the final page, the Next control is disabled.
- **AC-02-2.12** — When a new transaction is recorded between page requests, the next page request uses the current history without holding an earlier snapshot.
- **AC-02-2.13** — When the customer refreshes the history, the page returns to the first page and shows the current newest transactions.
- **AC-02-2.14** — When transactions have the same booking date and time, the transaction recorded later appears first.
- **AC-02-3.1** — When the selected customer requests an account that they own, they can view its transaction history.
- **AC-02-3.2** — When the selected customer requests an account that they do not own, the request returns `404 Not Found` with title `Not found`, detail `Account not found.`, and no account or transaction data.
- **AC-02-3.3** — A request for an unowned account and a request for a nonexistent account return identical status, title, detail, and response properties.
- **AC-02-3.4** — When the selected customer does not exist, the request returns the same `404 Not Found` response and shows no account or transaction data.
- **AC-02-3.5** — Changing the account identifier in a request does not let a customer view another customer's transaction history.
- **AC-02-4.1** — Viewing transaction history does not add, edit, or remove a transaction.
- **AC-02-4.2** — Viewing transaction history does not change the account balance.
- **AC-02-4.3** — Repeating the same request returns the same content, order, and total when the recorded history has not changed.
- **AC-02-4.4** — An attempt to change a transaction through this feature is refused and does not change transaction or account state.
- **AC-02-4.5** — A successful or refused history request does not create an access audit record.

## Rules from the ADR

Follow `docs/features/02/02-adr.md`, **Task 02 — View transaction history**.

### Decision 1 — Use page-number pagination with a database total

- Add `page` and `size` query parameters with defaults of `0` and `20` to the transaction-history endpoint.
- Return a dedicated page DTO with items, page, size, total elements, and total pages.
- Execute the page query and count in the repository; do not page an in-memory list.
- Sort by booking time descending and immutable transaction ID descending so later-recorded transactions win booking-time ties.
- Return `400 Bad Request` before repository access when page is negative, size is less than `1`, or size is greater than `100`.
- Return `200 OK` with empty items and unchanged totals when page is beyond the final page.
- Query current data for every page request; do not create or cache a paging snapshot.
- Show Previous and Next controls and `Page X of Y` when total pages is greater than `1`.
- Display `X` as the response page plus `1`, and display `Y` as total pages.
- Disable Previous when the response page is `0`, and disable Next when the response page is the final page.
- Reset the client page to `0` on browser refresh or account change.
- Add tests for default paging, sizes `1` and `100`, rejected paging bounds, the first page, middle page, final partial page, beyond-final page, zero results, total count, stable order, equal-time ties, inserts between page requests, refresh, page labels, and disabled controls.

### Decision 2 — Use the account ID as the transaction route key

- Add the account ID to the dedicated account response DTO.
- Pass the selected account ID from the account page to the history page.
- Add the customer ID and account ID to the transaction-history route.
- Never use a full or masked account number as the transaction lookup key.
- Never write the customer ID, account ID, or account number to application logs.
- Add tests that change the route account ID and receive no unrelated data.

### Decision 3 — Enforce ownership with one composite account lookup

- Add an account repository lookup that requires both account ID and customer ID.
- Perform that lookup in the transaction service before loading transactions.
- Use `NotFoundException("Account not found.")` for unowned accounts, nonexistent accounts, and nonexistent selected customers.
- Map every ownership refusal to `404 Not Found` with title `Not found`, detail `Account not found.`, and identical response properties.
- Do not include the requested identifiers or ownership result in the failure body or logs.
- Mark the service operation as read-only.
- Add tests for owned, unowned, nonexistent-account, nonexistent-selected-customer, and changed-identifier requests.

### Decision 4 — Store append-only transaction facts and running balances

- Add `V4__create_account_transaction.sql` with a foreign key to `account`.
- Store amount and running balance as `DECIMAL(19,8)` values that match the existing account balance capacity.
- Store booking time as a UTC instant with microsecond precision.
- Require a trimmed, nonblank description of at most `255` characters in validation and persistence.
- Store only booked, balance-affecting transactions; exclude pending and declined attempts.
- Represent a reversal as a new booked transaction and never mutate the original transaction.
- Store the running-balance snapshot as the account balance after the transaction.
- Store the signed amount without rounding it in the read path.
- Add an index that starts with account ID and supports the approved newest-first order plus ID tie-breaker.
- Model transaction fields without public mutation methods.
- Add only read methods to the Task 02 service and controller.
- Map transaction entities to a dedicated response DTO that includes the owned account currency; never serialize an entity directly.
- Keep amount and running balance as decimal strings in the web client; do not parse them as binary floating-point numbers.
- Format booking time in `Europe/London` as `DD MMM YYYY, HH:mm` using English month names.
- Show `Credit` with a plus sign for positive amounts and `Debit` with a minus sign for negative amounts; do not rely on colour alone.
- Prefix money with its three-letter currency code, show at least two decimal places, and preserve additional recorded non-zero digits up to eight without rounding.
- Show descriptions in full with wrapping and no truncation or ellipsis.
- Add database and web tests for account ownership, scale-eight values, currency display, signs and labels, London date formatting including daylight-saving boundaries, booked-only history, reversals, blank and 255-character descriptions, stable ordering, after-transaction running balance, and foreign-key enforcement.

## Full stack

Database: Add `V4__create_account_transaction.sql` under `api/src/main/resources/db/migration/`. Create append-only booked account transactions with an account foreign key, UTC booking instant, trimmed nonblank description up to `255` characters, signed `DECIMAL(19,8)` amount, after-transaction `DECIMAL(19,8)` running balance, and an index for account-scoped booking-time-descending paging with an ID tie-breaker. Model reversals as new rows and exclude pending and declined attempts. Add representative owned, unrelated, empty, equal-time, multi-page, precision, reversal, and description-boundary fixtures.

Backend: Extend the account response with its ID. Add an account lookup by account ID and selected customer ID. Add a transaction package with immutable persistence, ordered current-data page and count queries, a read-only service, dedicated response records including currency, mapper, and `GET /api/customers/{customerId}/accounts/{accountId}/transactions?page={page}&size={size}`. Apply page `0`, default size `20`, maximum size `100`, `400 Bad Request` for invalid bounds, and an empty `200 OK` response beyond the final page. Map unowned, nonexistent-account, and nonexistent-selected-customer requests to the same generic `404 Not Found`. Add repository, service, controller, contract, and database integration tests for every acceptance criterion and NFR.

Frontend: Extend the account client model with the account ID and add navigation to an owned account's history. Add a transaction-history client and page that renders Europe/London booking time, wrapping description, Credit or Debit label and sign, currency-prefixed exact amount, exact after-transaction running balance, empty and failure states, total count, Previous and Next controls, and `Page X of Y` when more than one page exists. Disable Previous on the first page and Next on the final page, and reset to page `0` on refresh or account change. Keep monetary values as strings and test loading, generic ownership failures, current-data page movement, exact rendering, date formatting, and repeated reads.

## Banking obligations

Money: Applies. Use `BigDecimal` and `DECIMAL(19,8)` for signed amounts and after-transaction running balances. Preserve values without read-time rounding or binary floating-point conversion. Prefix the string value with the account's three-letter currency code, keep at least two decimal places, and retain additional recorded non-zero digits up to eight places.

Authorisation: Applies. Resolve the account in the service by both selected customer ID and requested account ID before querying transactions. Use the same `404 Not Found` title, detail, and response properties for unowned accounts, nonexistent accounts, and nonexistent selected customers. Production authentication is outside Task 02.

Audit: Not applicable. Task 02 performs no state change and writes no access-audit event for successful or refused reads. Its immutable records and read-only transaction must allow tests to prove that viewing does not change transactions, balances, or audit records.

Idempotency: Applies. Use a read-only service transaction, deterministic ordering, and no writes. Repeating a request against unchanged data must return the same items, order, and totals. Each request reads current data, refresh requests page `0`, and no idempotency key or replay store applies.
