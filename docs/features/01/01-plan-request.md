## What must exist when this is done

A signed-in customer can view one page listing every account they own with its recognised name, masked account number, currency, and exact balance. The implementation must provide the accounts database model linked to existing customers, a customer-scoped backend read endpoint, and a frontend account-list page with an empty state.

## Scope

In scope:

- Add the accounts schema and customer ownership relationship under `api/src/main/resources/db/migration/`.
- Add the account entity, repository, service, mapper, response DTO, controller, and tests under the existing `com.neueda.capstone` package conventions.
- Resolve the signed-in customer and query only that customer's accounts.
- Add the frontend account API client, account-list page, loading state, empty state, masked account number rendering, and exact balance rendering under `web/src/`.
- Follow the existing customer slice: controllers handle HTTP only, services own repository access and read-only transactions, entities are mapped to record DTOs, and tests use JUnit 5, AssertJ, `@WebMvcTest`, and MockMvc.

Out of scope:

- Account creation, editing, deletion, closure, or balance mutation.
- Payments, transfers, standing orders, overdrafts, or any money movement.
- Mobile app support, international payments, and currency conversion.
- Operations-officer account search or full account-number access.
- Implementing customer authentication; integrate with the existing caller-identity mechanism only.
- Adding account-view audit events before the business decides whether reads must be audited.
- Choosing an exact account-number masking format, currency display precision, currency-symbol policy, account ordering, or partial-load behavior where the source documents are silent.

## Acceptance criteria

- **AC-01-1.1** — When the customer owns one or more accounts, the page lists every account they own with its recognised name, account number, currency, and balance.
- **AC-01-1.2** — When the customer owns no accounts, the page shows an empty state and does not show another customer's account.
- **AC-01-1.3** — When an account is added to the customer's holdings, it appears in the customer's account list; when it is no longer held, it does not appear.
- **AC-01-2.1** — When the customer requests their accounts, every displayed account belongs to that customer.
- **AC-01-2.2** — When the request contains an identifier for an account owned by another customer, the other customer's account is not displayed.
- **AC-01-2.3** — When the request contains an identifier for another customer, the response still contains only the signed-in customer's accounts.
- **AC-01-3.1** — When an account balance is `1234.5`, the page displays the balance with the required currency precision rather than as `1234.5`.
- **AC-01-3.2** — When an account balance is `1234.50000001`, the page does not display a value that silently changes the balance through unintended rounding or truncation.
- **AC-01-3.3** — When two accounts have different balances, the page displays their balances as separate values and does not substitute one account's balance for another's.
- **AC-01-4.1** — When an account is listed, its displayed account number is visibly masked and does not contain the complete number.
- **AC-01-4.2** — When an account number is short or has an unusual length, the page still does not display it in full.
- **AC-01-4.3** — When a customer views multiple accounts, no account number in the list is shown in full.

## Rules from the ADR

Follow `docs/features/01/01-adr.md`.

- Resolve the signed-in customer before loading accounts.
- Query accounts using the resolved customer identity as the ownership predicate.
- Ignore request-supplied customer and account identifiers when determining the customer's account set.
- Keep account repository calls inside the account service, not in the controller.
- Mark the account-list service operation as a read-only transaction.
- Add tests proving that another customer's account is absent even when its identifier is supplied.
- Define the unauthenticated and unknown-caller response once the authentication contract is available; do not fall back to a caller-provided customer id.
- Define an account response DTO containing only the account name, masked account number, currency, and exact balance needed by the page.
- Map entities to the response DTO in a dedicated mapper or equivalent boundary component.
- Apply the approved masking policy during mapping, never in the browser only.
- Never include the full account number in a response, application log, exception message, or serialized entity representation.
- Add tests for normal, short, unusual-length, and multiple account numbers after the masking policy is decided.
- Keep operations-officer full-number access, if required later, behind a separate authorized contract rather than widening this DTO.
- Use an exact decimal representation for balances; never use binary floating-point types.
- Preserve the balance value through repository, service, mapper, and response DTO layers without implicit conversion to a floating-point type.
- Apply currency-specific scale and rounding only after the business precision policy is agreed.
- Compare balances using decimal-value comparison, not object identity or binary floating-point equality.
- Add tests for `1234.5`, `1234.50000001`, and two accounts with different balances.
- Keep balance formatting separate from ownership filtering and account-number masking.

## Full stack

Database: Add a Flyway migration under `api/src/main/resources/db/migration/` for an accounts table belonging to existing customers, with account name, account number, currency, and an exact decimal balance. Add representative data for owned and unrelated accounts without exposing full account numbers in logs.

Backend: Add an account package following the customer slice with an entity, repository query scoped by customer ownership, `@Transactional(readOnly = true)` service method, dedicated masked response record, mapper, and customer-facing GET endpoint. Add service tests for owned and unrelated accounts, ignored request identifiers, empty results, exact decimal balances, masking, and repeated read behavior. Add `@WebMvcTest` and MockMvc tests for the endpoint response and error behavior.

Frontend: Add the accounts API client and a page under `web/src/` that lists account name, masked account number, currency, and exact balance. Implement loading and no-accounts states, preserve the API balance without binary floating-point parsing, and test or verify that multiple accounts retain separate balances and no full account number is rendered.

## Banking obligations

Money: Account balances must use an exact decimal representation through persistence, service, mapper, API, and frontend. Do not introduce unintended truncation or rounding. Currency-specific scale and symbol formatting remain a business gap.

Authorisation: Only the signed-in customer may see accounts they own. Query by the resolved caller identity and ignore request-supplied customer or account identifiers. The unauthenticated and unknown-caller response remains a gap because the authentication contract is not defined.

Audit: This is read-only and does not move money. The acceptance criteria do not decide whether viewing accounts must be audited, what must be recorded, or what retention applies; do not add an audit event until that business decision is made.

Idempotency: Repeated account-list requests must not create, update, delete, or otherwise mutate accounts or balances. Use a read-only service operation and return the caller's current owned account set.
