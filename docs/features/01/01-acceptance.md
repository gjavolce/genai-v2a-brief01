# Task 01 — View my accounts

## Functional requirements

### FR-01-1 — Show the customer's accounts

The customer selected in the existing customer list can see, on one page, every
account they hold with the bank, including the account name they recognise,
account number, currency, and balance.

### Acceptance criteria

- **AC-01-1.1** — When the customer owns one or more accounts, the page lists every account they own with its recognised name, account number, currency, and balance.
- **AC-01-1.2** — When the customer owns no accounts, the page shows an empty state and does not show another customer's account.
- **AC-01-1.3** — When an account is added to the customer's holdings, it appears in the customer's account list; when it is no longer held, it does not appear.

### FR-01-2 — Restrict the account list to the customer

A customer can see only accounts they own, and changing any account or customer
identifier supplied with the request does not reveal an account owned by someone
else.

### Acceptance criteria

- **AC-01-2.1** — When the customer requests their accounts, every displayed account belongs to that customer.
- **AC-01-2.2** — When the request contains an identifier for an account owned by another customer, the other customer's account is not displayed.
- **AC-01-2.3** — When the request contains an identifier for another customer, the response contains only the accounts belonging to the customer selected in the existing customer list.

### FR-01-3 — Display exact balances

The page displays each account's balance without changing its value through
truncation, rounding, or loss of significant decimal places.

### Acceptance criteria

- **AC-01-3.1** — When an account balance is `1234.5`, the page displays the balance with the required currency precision rather than as `1234.5`.
- **AC-01-3.2** — When an account balance is `1234.50000001`, the page does not display a value that silently changes the balance through unintended rounding or truncation.
- **AC-01-3.3** — When two accounts have different balances, the page displays their balances as separate values and does not substitute one account's balance for another's.

### FR-01-4 — Protect full account numbers

The page does not show any customer's complete account number.

### Acceptance criteria

- **AC-01-4.1** — When an account is listed, its displayed account number is visibly masked and does not contain the complete number.
- **AC-01-4.2** — When an account number is short or has an unusual length, the page still does not display it in full.
- **AC-01-4.3** — When a customer views multiple accounts, no account number in the list is shown in full.

## Open questions

- Which part of an account number may be shown, and what exact masking format should customers see?
- How many decimal places must be displayed for each supported currency, and should a currency symbol be shown in addition to the currency code?
- In what order should multiple accounts appear on the page: a customer-selected order, account name, account type, or another order?
- Is viewing an account list itself an auditable event, and if so, which users or investigators must be able to see it?
- What should the customer see if one or more account details cannot be loaded while other account details are available?

## The four questions

**Money.** The feature displays account balances. The balance shown to the
customer must preserve the account's exact value and required currency
precision; the display must not introduce an unintended rounding, truncation, or
substitution. The required precision and currency presentation remain an open
business decision above.

**Authorisation.** Only the customer selected in the existing customer list may
see accounts belonging to that customer. The account request must scope results
to the selected customer rather than returning accounts from another customer.

**Audit.** The account list is read-only and does not move money. It is an open
question whether viewing account information must itself be recorded for a
regulator, customer dispute, or operations investigation.

**Idempotency.** Repeating the same account-list request must not create,
remove, or change any account or balance. Each repeated view should show the
customer's current account holdings, subject to any account changes made
between requests.

## Verification

- There are four functional requirements, each with acceptance criteria.
- The ownership requirement includes refusal cases for another account and another customer identifier.
- Every criterion names an observable page result or visible account value.
- No acceptance criterion chooses a class, table, framework, library, or data type.
- Money, authorisation, audit, and idempotency are all addressed; audit and display conventions have explicit open questions.
- Open questions records unresolved masking, currency precision, ordering, audit, and partial-data behavior rather than guessing.

Finish: 4 FRs, 12 criteria, 5 open questions.
