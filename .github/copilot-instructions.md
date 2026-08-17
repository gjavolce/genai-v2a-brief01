# Project conventions

## Stack

Java 21, Spring Boot 3, Maven. MySQL 8 with Flyway migrations.
React 18 with TypeScript and Vite.

## Architecture

Controllers handle HTTP only — no business logic.
Services hold business logic and own the transaction boundary.
Repositories are called from services, never from controllers.
`@Transactional` goes on the service method, not the controller.

Entities are never serialised to the client. Every endpoint returns a DTO.
Request validation uses Bean Validation annotations on the request DTO.

## Naming

Java classes PascalCase, methods and fields camelCase.
React components PascalCase, files kebab-case.
Flyway migrations `V<n>__snake_case_description.sql`.

## Testing

JUnit 5 with AssertJ. No Mockito for value objects.
Test method names read as sentences: `shouldRejectApplicationBelowMinimumAmount`.
Arrange-Act-Assert, with a blank line between the three blocks.
Controller tests use `@WebMvcTest` with MockMvc.
