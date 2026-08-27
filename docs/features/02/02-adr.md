# Task 02 — View transaction history

## Referenced decisions

- **Task 01, Decision 1 — Scope account retrieval by the selected customer.** Apply the same demo caller context and service-layer ownership boundary to transaction history for FR-02-3.
- **Task 01, Decision 2 — Return a dedicated account DTO with masking at the boundary.** Apply the same DTO isolation and account-number logging rules to transaction responses for FR-02-1 and FR-02-3.
- **Task 01, Decision 3 — Preserve balances as exact decimal values across the API.** Apply the same exact-decimal rule to transaction amounts and running balances for FR-02-1.

## Decisions

### Decision 1 — Use page-number pagination with a database total

**Context**

FR-02-2 requires bounded pages, newest-first order, a total count, and stable
page continuation when the history has not changed. The query must not load a
complete multi-year history into application memory.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| **Chosen — Page number and size with an ordered database query and total count** | Directly supplies the required total; supports simple next and previous controls; fits the current repository conventions | Large offsets become slower as history grows; concurrent inserts can shift later pages |
| Cursor pagination with a separate count query | Performs well on deep histories; resists page shifting when new rows arrive | Adds cursor state and a second count query; page-number navigation is harder |
| Load all transactions and divide them in the service | Simple response assembly | Violates bounded retrieval; memory and response time grow with account history |

**Decision**

Use zero-based page and size request parameters. Default page to `0` and size to
`20`, and accept sizes from `1` through `100`. Query only the requested page and
return its items, page number, page size, total elements, and total pages. A
request beyond the final page returns `200 OK` with empty items and unchanged
totals. Order by the approved transaction date descending and then by the
immutable transaction identifier descending, so a later-recorded transaction
wins a booking-time tie. Each request reads current data; no snapshot is held
between page requests. A browser refresh resets the requested page to `0` and
shows the current newest transactions. When more than one page exists, the web
client shows Previous and Next controls and `Page X of Y`. It displays the
zero-based response page as one-based `X`, disables Previous on page `0`, and
disables Next on the final page.

**Consequences**

The client receives the total and can render paging without loading all rows.
The fixed maximum bounds each result to 100 rows, and the unique second sort key
makes unchanged history deterministic. Deep pages can be slower. New
transactions can shift items between offset-based pages, which is accepted
because each request intentionally reflects current data. Previous and Next
controls are simple, but reaching a distant page requires repeated actions
because there is no direct page jump.

**Implications for code**

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

**Context**

FR-02-1 requires the customer to select an account, and FR-02-3 requires the
request to resist identifier changes. Task 01 does not return an account ID and
must not expose a full account number.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| **Chosen — Return the internal account ID and use it in the route** | Uses the existing account key; needs no new identifier column; supports a short implementation | IDs are enumerable, so the ownership check must never be optional |
| Add a new opaque public account reference | Makes enumeration harder; separates public and database identities | Requires a schema change, generation rules, migration, and more tests |
| Use the full or masked account number | Avoids another visible identifier | A full number violates confidentiality; a masked number is not unique and cannot identify an account safely |

**Decision**

Add the account ID to the Task 01 account response. Use
`/api/customers/{customerId}/accounts/{accountId}/transactions` for the paged
read. Treat the ID only as a route key, not as proof of ownership.

**Earlier ADR impact**

This decision extends Task 01, Decision 2, which limited the account DTO to the
fields needed by the account page. Task 02 adds only the account ID required for
safe navigation. It does not change the earlier masking, DTO isolation, or
logging rules.

**Consequences**

The account page can open history without exposing a full account number or
adding a new identifier scheme. Sequential IDs can be guessed, so every request
depends on the composite ownership check in Decision 3. A future public API may
need an opaque reference and a contract migration.

**Implications for code**

- Add the account ID to the dedicated account response DTO.
- Pass the selected account ID from the account page to the history page.
- Add the customer ID and account ID to the transaction-history route.
- Never use a full or masked account number as the transaction lookup key.
- Never write the customer ID, account ID, or account number to application logs.
- Add tests that change the route account ID and receive no unrelated data.

### Decision 3 — Enforce ownership with one composite account lookup

**Context**

FR-02-3 requires owned history to succeed and unowned or nonexistent accounts
to fail with the same observable response. An owned account with no
transactions must still return an empty page under FR-02-1.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| **Chosen — Resolve the account by account ID and selected customer ID in the service** | Establishes ownership before the history query; distinguishes an owned empty history; returns one safe failure for absent ownership | Adds one account lookup before the page and count queries |
| Load the account by ID and compare its customer ID in application code | Easy with the current repository | Loads an unowned account and makes accidental detail leakage easier |
| Check ownership in the controller | Can reject before calling the transaction service | Duplicates security logic across entry points and lets other callers bypass it |
| Query transactions by account and customer in one join | Keeps ownership in the database query | An empty result cannot distinguish an owned empty account from an unowned account |

**Decision**

The transaction service treats the selected customer as the demo caller context
and resolves an account with both `accountId` and the selected `customerId`. It
stops before the transaction query when that lookup returns no account. An
unowned account, a nonexistent account, and a nonexistent selected customer all
throw `NotFoundException("Account not found.")`. The existing global exception
handler maps that exception to `404 Not Found` with title `Not found` and detail
`Account not found.`.

**Consequences**

The service owns one testable authorisation rule, and an owned account can
return a valid empty page. Each request performs an extra lookup, and the
selected customer remains a demo caller context rather than production
authentication.

**Implications for code**

- Add an account repository lookup that requires both account ID and customer ID.
- Perform that lookup in the transaction service before loading transactions.
- Use `NotFoundException("Account not found.")` for unowned accounts, nonexistent accounts, and nonexistent selected customers.
- Map every ownership refusal to `404 Not Found` with title `Not found`, detail `Account not found.`, and identical response properties.
- Do not include the requested identifiers or ownership result in the failure body or logs.
- Mark the service operation as read-only.
- Add tests for owned, unowned, nonexistent-account, nonexistent-selected-customer, and changed-identifier requests.

### Decision 4 — Store append-only transaction facts and running balances

**Context**

FR-02-1 requires each item to contain a date, description, signed amount, and
running balance. FR-02-4 requires history reads to leave transactions and
accounts unchanged. The banking brief also requires each money movement to be
reconstructable.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| **Chosen — Store each transaction and its running-balance snapshot as an append-only record** | Makes reads fast; preserves the value shown at the time; supports later reconstruction | Duplicates balance data; future write flows must keep the transaction and account balance consistent |
| Store transactions and calculate every running balance from an opening balance | Avoids duplicated running balances; one calculation rule | Deep pages require earlier history; calculation errors affect many rows; later rule changes can alter historical output |
| Derive history from audit events | Reuses an existing append-only concept | Current audit events do not contain monetary before and after values or customer-facing descriptions |

**Decision**

Create an `account_transaction` record for each booked, balance-affecting
movement. Store its account, UTC booking time, nonblank description of at most
255 characters, signed exact-decimal amount, and exact-decimal balance after the
transaction. Pending and declined attempts are not transaction-history records.
A reversal is a separate booked transaction; the original record remains
unchanged. Use the owned account's currency in each response item. Do not expose
update or delete operations for these records. Task 02 reads existing records
and never writes them.

**Consequences**

History pages need no balance reconstruction and can reproduce recorded money
values. Stored snapshots consume more space and create a consistency duty for
future payment features. A failed future movement must roll back the account
balance, transaction record, and audit record together; that write design is
outside Task 02.

**Implications for code**

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

## Non-functional requirements

- **NFR-02-1 — Ownership confidentiality:** Every history request must resolve the account by both account ID and selected customer ID before returning a row.
- **NFR-02-2 — Indistinguishable refusal:** Unowned accounts, nonexistent accounts, and nonexistent selected customers must produce `404 Not Found` with byte-equivalent title `Not found`, detail `Account not found.`, and response properties.
- **NFR-02-3 — Bounded retrieval:** A request must load no more than `100` transaction rows and must not load unrelated account history into memory.
- **NFR-02-4 — Deterministic order:** Unchanged transaction data must return in booking-time-descending and immutable-ID-descending order on every request.
- **NFR-02-5 — Monetary precision:** Amounts and running balances must cross persistence, service, response, and web boundaries without binary floating-point conversion or read-time rounding; display must retain two through eight recorded decimal places.
- **NFR-02-6 — Read immutability:** A history request must perform no insert, update, or delete against accounts, transactions, or audit records.
- **NFR-02-7 — Response isolation:** Customer responses, errors, and application logs must contain no transaction entity and no full account number.
- **NFR-02-8 — Read idempotency:** Repeating a page request against unchanged data must return the same items, order, and totals and must produce no state change; each request otherwise reflects current data and refresh starts at page `0`.

## Business gaps

None — the acceptance criteria resolve all Task 02 business decisions required by this ADR.

## The four questions

### Money

Use `BigDecimal` for amounts and running balances and `DECIMAL(19,8)` for both
database columns. Preserve signed values at scale eight without read-time
rounding. Use decimal-value comparison, not binary floating-point comparison.
Send decimal strings to the web client. Prefix values with the account's
three-letter currency code, show at least two decimal places, and remove only
trailing zeros beyond the second decimal place. Preserve up to eight recorded
non-zero decimal places without rounding. The stored running balance is the
balance after the transaction.

### Authorisation

Enforce ownership in the transaction service with a composite lookup of the
requested account ID and selected customer ID. Stop before the transaction
query when no owned account is found. Use
`NotFoundException("Account not found.")` for an unowned account, nonexistent
account, or nonexistent selected customer. Map all three to `404 Not Found`
with title `Not found`, detail `Account not found.`, and identical response
properties. The selected customer is the existing demo caller context;
production authentication is outside Task 02.

### Audit

**Not applicable — Task 02 is read-only and writes no audit event.** Actor,
action, before state, after state, write transaction boundary, and audit-write
failure therefore do not apply to this read path. Prove non-mutation with a
read-only service transaction and integration tests that confirm successful and
refused history requests create no audit record.

### Idempotency

Use a read-only service transaction, a complete deterministic sort, and no
writes in the request path. A replay returns the current page; it returns the
same items and totals when the stored history has not changed. No idempotency
key, application replay store, or database uniqueness constraint is required
for this read operation. Each page request intentionally queries current data,
and a browser refresh requests page `0`.

Finish: 4 decisions made, 3 decisions referenced from earlier ADRs, 8 NFRs written, 0 gaps found.
