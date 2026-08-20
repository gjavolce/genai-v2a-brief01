# Task 01 — View my accounts

## Decisions

### Decision 1 — Scope account retrieval by the selected customer

**Context**

FR-01-1 and FR-01-2 require the page to show every account held by the customer
selected in the existing customer list. The selected customer identifier is the
existing demo application's caller context; this task does not introduce
authentication infrastructure.

The current customer reference slice keeps repository access behind a service
and performs read operations in a read-only transaction. The account endpoint
must therefore use the selected customer identifier as its ownership predicate.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| Query accounts by the customer selected in the existing customer list | Matches the current application's interaction model; keeps ownership filtering explicit; requires no new authentication infrastructure | The selected customer is a demo context rather than a real authenticated identity; a future authenticated application must replace this boundary |
| Accept an arbitrary customer or account identifier as the authoritative query scope | Simple endpoint shape; useful for administrative searches | Allows callers to request unrelated customer data without the existing selection context |
| Load a broad account set and filter ownership after retrieval | Can reuse a simple repository query | Risks accidental data exposure, is inefficient, and makes it easier to omit the ownership check in a future path |

**Decision**

Scope the account query by the customer selected in the existing customer list.
Return only accounts whose ownership belongs to that selected customer. Do not
add authentication infrastructure in this task.

**Consequences**

The ownership rule is centralized in the service and can be tested with another
customer's identifier, while an account with no holdings naturally produces an
empty result. The endpoint represents the current demo selection model and
cannot be treated as production authentication or reused directly for
operations-officer searches.

**Implications for code**

- Resolve the customer selected in the existing customer list before loading accounts.
- Query accounts using the selected customer identity as the ownership predicate.
- Treat the selected customer identifier as the demo caller context; do not add authentication infrastructure in this task.
- Keep account repository calls inside the account service, not in the controller.
- Mark the account-list service operation as a read-only transaction.
- Add tests proving that another customer's account is absent even when its identifier is supplied.
- Define the missing or unknown selected-customer response at the endpoint boundary; do not return accounts without a selected customer.

### Decision 2 — Return a dedicated account DTO with masking at the boundary

**Context**

FR-01-1 requires account name, account number, currency, and balance to be
shown, while FR-01-4 requires the complete account number never to be shown.
The banking brief also prohibits account numbers and personal data in
application logs. Returning entities directly would make it too easy for a
future endpoint, serializer, or log statement to expose the stored identifier.

The customer reference slice uses dedicated record DTOs and mapper classes.
Task 01 should establish the same boundary for account data and make masking a
property of the representation returned to the web client.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| Map accounts to a dedicated response DTO that contains only the approved fields and a masked account number | Prevents entity leakage; makes the API contract explicit; gives one controlled place for masking | Requires a mapper and a masking policy; future views may need additional DTOs |
| Return the account entity and rely on serializer annotations to hide fields | Less mapping code; fields can be reused quickly | Exposure depends on serializer configuration; another endpoint or log can still use the full entity; masking rules are harder to test as business output |
| Return the full account number and mask only in the frontend | Keeps the API data-rich; simplest backend response | Violates the requirement if any client, network observer, browser state, or log sees the response; every client must implement the security rule correctly |

**Decision**

Return a dedicated account response DTO containing only the customer-visible
fields. Apply account-number masking while mapping to that DTO, before the value
leaves the backend. Do not serialize or log the stored full account number.
Because the analyst has not received the exact masking format, preserve the
requirement that the full value is never returned and record the exact visible
portion as a business gap rather than inventing it here.

**Consequences**

The API has a stable, testable privacy boundary and the frontend receives data
that is safe to render directly. Adding a new customer-visible account field
requires an explicit DTO and mapper change, and operations tooling cannot reuse
this customer DTO for privileged full-number access. A masking policy still has
to be agreed before implementation can define the exact output for unusual
account-number lengths.

**Implications for code**

- Define an account response DTO containing only the account name, masked account number, currency, and exact balance needed by the page.
- Map entities to the response DTO in a dedicated mapper or equivalent boundary component.
- Apply the approved masking policy during mapping, never in the browser only.
- Never include the full account number in a response, application log, exception message, or serialized entity representation.
- Add tests for normal, short, unusual-length, and multiple account numbers after the masking policy is decided.
- Keep operations-officer full-number access, if required later, behind a separate authorized contract rather than widening this DTO.

### Decision 3 — Preserve balances as exact decimal values across the API

**Context**

FR-01-3 requires balances not to be changed by truncation, unintended rounding,
or substitution. The task explicitly treats `1234.5` and `1234.50000001` as
defects when displayed without the required precision. The frontend therefore
must receive a value that can represent the stored balance exactly enough for
the agreed currency rules, and the backend must not use a binary floating-point
representation for monetary values.

The brief says currency conversion is out of scope, so this feature needs no
cross-currency calculation. The analyst has not specified the number of display
places or whether a symbol is shown, so the architecture can preserve the exact
value but must not invent the final presentation rule.

**Options considered**

| Option | Pros | Cons |
| --- | --- | --- |
| Store and transport balances as decimal values with explicit scale, and format only at the presentation boundary using the agreed currency precision | Preserves monetary exactness; supports deterministic comparisons and formatting; matches the requirement's precision concerns | Requires an explicit precision policy per supported currency; clients must not parse the value as a binary float |
| Store and transport balances as binary floating-point numbers | Familiar in many languages; compact and convenient for simple rendering | Cannot represent many decimal monetary values exactly; invites rounding and equality defects |
| Transport balances as preformatted strings only | Prevents client floating-point conversion; easy for the page to render | Couples the API to one presentation format; makes machine validation and future calculations harder; still needs a source precision policy |

**Decision**

Represent balances with an exact decimal type in persistence and service code,
serialize them without binary floating-point conversion, and apply the agreed
currency precision at the presentation boundary. Until the business decides the
precision and currency-symbol policy, do not silently round or truncate values
such as `1234.50000001`.

**Consequences**

Balance comparisons and API contract tests are deterministic, and the frontend
can render distinct account values without binary precision loss. The system
must define validation and scale rules for each supported currency before the
final formatter is implemented. Preserving more fractional digits than a
customer-facing currency normally displays may require a later, explicit
business decision rather than an implicit formatting change.

**Implications for code**

- Use an exact decimal representation for balances; never use binary floating-point types.
- Preserve the balance value through repository, service, mapper, and response DTO layers without implicit conversion to a floating-point type.
- Apply currency-specific scale and rounding only after the business precision policy is agreed.
- Compare balances using decimal-value comparison, not object identity or binary floating-point equality.
- Add tests for `1234.5`, `1234.50000001`, and two accounts with different balances.
- Keep balance formatting separate from ownership filtering and account-number masking.

## Non-functional requirements

- **NFR-01-1 — Ownership confidentiality:** For every account-list response, 100% of returned accounts must belong to the customer selected in the existing customer list; unrelated customer identifiers must not alter that result.
- **NFR-01-2 — Account-number confidentiality:** No customer-facing account response, application log, or exception message may contain a complete account number.
- **NFR-01-3 — Monetary precision:** Account balances must cross the backend boundary without binary floating-point conversion, unintended truncation, or unintended rounding.
- **NFR-01-4 — DTO isolation:** Account entities must not be serialized directly to the customer-facing response.
- **NFR-01-5 — Read consistency:** The account-list operation must not create, update, delete, or otherwise mutate accounts or balances; repeating the request is observationally idempotent.
- **NFR-01-6 — Read performance:** The account-list operation must retrieve only the selected customer's accounts rather than loading unrelated customers' accounts into application memory.
- **NFR-01-7 — Auditability gap:** The acceptance criteria do not decide whether account-list viewing is an auditable event. This needs a business decision before an audit record or retention rule is added.

## The four questions

**Money.** Use an exact decimal representation and preserve the value through the
API. Apply scale and rounding only according to an agreed currency policy. The
acceptance criteria do not specify the supported currencies' decimal places or
symbol format; this is a business gap.

**Authorisation.** Enforce ownership in the account service by querying with the
customer selected in the existing customer list. The selected customer is the
demo caller context for this task; a missing or unknown selection must not return
accounts. Production authentication is out of scope.

**Audit.** This is a read-only feature and does not move money. The acceptance
criteria do not decide whether viewing accounts must be audited, what actor and
fields would be recorded, or what retention applies. Do not add an audit event
without that business decision.

**Idempotency.** Repeated reads must not mutate state and must return the
caller's current owned account set. Enforce this by using a read-only service
operation and avoiding writes in the request path. No client idempotency key is
needed for this read operation.

## Verification

- Three decisions are documented, and each cites one or more FRs from `acceptance.md`.
- Each decision presents at least two defensible options with trade-offs.
- Each consequences section names a genuine downside or unresolved cost.
- Every implications-for-code bullet is an actionable implementation rule.
- No decision duplicates an earlier ADR; no earlier ADR exists for task 01.
- Money, authorisation, audit, and idempotency are answered or explicitly flagged as gaps.
- NFRs are testable where the business contract is settled, with audit and authentication gaps called out rather than invented.

Finish: 3 decisions made, 0 decisions referenced from earlier ADRs, 7 NFRs written, 2 gaps found.
