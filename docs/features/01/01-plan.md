## Plan: Task 01 Account View

Implement the account view across database, backend, and frontend while following the current contracts in `docs/features/01/01-acceptance.md` and `docs/features/01/01-adr.md`.

**Steps**

1. Use the customer selected in the existing customer list as the demo caller context, pass that selected customer ID to the account view, and define the missing or unknown selected-customer response. Do not add authentication infrastructure.
2. Decide account-number masking, currency precision, currency symbols, account ordering, partial-load behavior, and read-audit policy.
3. Add the next Flyway migration under `api/src/main/resources/db/migration/` for accounts linked to existing customers, with exact decimal balances and representative seed data. Include fixture data that supports changing an account's customer ownership in a test without adding account lifecycle endpoints.
4. Add the account entity, ownership-scoped repository, read-only service, masked DTO, mapper, and GET controller under `com.neueda.capstone.account`.
5. Add JUnit 5, AssertJ, and MockMvc tests covering ownership isolation, ignored request identifiers, empty results, exact balances, masking, repeated reads, and error responses. Add an integration test that assigns a fixture account to the selected customer and verifies it appears in the account list, changes the fixture ownership so it is no longer held, and verifies it no longer appears; use database fixture state changes rather than implementing account creation or deletion.
6. Add `web/src/api/accounts.ts` and the React account-list view with loading, error, empty, and populated states.
7. Preserve balances without binary floating-point conversion and never expose full account numbers in responses, logs, exceptions, or the UI.
8. Run focused backend tests, frontend checks, `./verify.sh`, manual verification, and an ADR/acceptance compliance review.

**Scope**

Included: account schema and seed data, backend account domain/API, focused tests, frontend API/page/states, and verification.

Excluded: account lifecycle, payments, transfers, standing orders, overdrafts, currency conversion, mobile support, operations search, full-number access, new authentication infrastructure, read auditing, and unrelated refactors.

**Verification**

- Backend ownership, masking, DTO, decimal, controller, and fixture-ownership integration tests pass, including AC-01-1.3's add/remove ownership transitions.
- Frontend typecheck/build passes.
- `./verify.sh` passes.
- Manual checks confirm owned accounts, empty state, tampered identifiers, exact balances, masked numbers, and that the account list changes when fixture ownership changes.
- The diff changes the database, backend, and frontend only within task scope.
