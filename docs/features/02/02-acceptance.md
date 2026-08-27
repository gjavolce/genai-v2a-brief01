# Task 02 — View transaction history

## Functional requirements

### FR-02-1 — Show transaction history

The customer can view the transaction history of an account that they own.

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

### FR-02-2 — Return ordered pages and a total

The transaction history is divided into pages, is ordered newest first, and
states the total number of transactions.

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

### FR-02-3 — Protect transaction history

Only the customer who owns an account can view its transaction history, and a
failure must not disclose whether another account exists.

- **AC-02-3.1** — When the selected customer requests an account that they own, they can view its transaction history.
- **AC-02-3.2** — When the selected customer requests an account that they do not own, the request returns `404 Not Found` with title `Not found`, detail `Account not found.`, and no account or transaction data.
- **AC-02-3.3** — A request for an unowned account and a request for a nonexistent account return identical status, title, detail, and response properties.
- **AC-02-3.4** — When the selected customer does not exist, the request returns the same `404 Not Found` response and shows no account or transaction data.
- **AC-02-3.5** — Changing the account identifier in a request does not let a customer view another customer's transaction history.

### FR-02-4 — Keep transaction history read-only

Viewing transaction history does not change a transaction or an account.

- **AC-02-4.1** — Viewing transaction history does not add, edit, or remove a transaction.
- **AC-02-4.2** — Viewing transaction history does not change the account balance.
- **AC-02-4.3** — Repeating the same request returns the same content, order, and total when the recorded history has not changed.
- **AC-02-4.4** — An attempt to change a transaction through this feature is refused and does not change transaction or account state.
- **AC-02-4.5** — A successful or refused history request does not create an access audit record.

## Open questions

None — the acceptance criteria define paging changes, tie order, date display,
money display, running-balance meaning, included transactions, descriptions,
safe failures, caller context, and read-audit behaviour.

## The four questions

### Money

The feature displays signed transaction amounts and after-transaction running
balances with their three-letter currency code. It must show at least two
decimal places and preserve each additional recorded non-zero digit up to eight
places without rounding, truncation, sign changes, or substitution. Payment
limits do not apply because this feature does not move money.

### Authorisation

The selected customer is the caller context for this feature. Only that
customer may view an account that they own. Unowned, nonexistent, and
unknown-customer requests return the same generic `404 Not Found` response.

### Audit

The bank must be able to prove to a customer in a dispute, an operations
officer, or a regulator that the displayed history corresponds to immutable
booked money movements and that viewing it did not change those records. This
feature does not create audit records for successful or refused reads.

### Idempotency

A repeated request is harmless. It causes no state change and returns the same
content, order, and total when history has not changed. Each request uses the
current history, and refresh returns to the first page.

**Summary: 4 functional requirements, 36 acceptance criteria, 0 open questions.**
