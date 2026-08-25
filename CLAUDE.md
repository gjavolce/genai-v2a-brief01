# PayFlow project rules

All agents and workflows must obey these rules. A feature ADR takes precedence
when it conflicts with this file.

## Prompt language

Use ASD-STE100-style Simplified Technical English in agent, command, and skill
instructions.

- Use short sentences and active voice.
- Give one instruction in each sentence.
- Use one term for one meaning.
- Use `must` for requirements and `do not` for prohibitions.
- Do not use idioms, metaphors, or rhetorical text.

## Agent speed

- Start the requested work immediately.
- Do not describe routine tool calls or repeat the request.
- Search with `rg` before you open many files.
- Read only the files that can change the result.
- Run independent read-only checks in parallel when possible.
- Give a progress update only at a gate, result, or blocker.
- Return only the output that the active workflow requires.
- Keep a routine report under 120 words. Required tables do not count.

## Stack

- Use Java 21, Spring Boot 3, and Maven for the API.
- Use MySQL 8 and Flyway for the database.
- Use React 18, TypeScript, and Vite for the web application.

## Architecture

- Put only HTTP logic in controllers.
- Put business logic and transaction boundaries in services.
- Call repositories only from services.
- Put `@Transactional` on service methods. Do not put it on controllers.
- Do not send entities to a client. Return DTOs from all endpoints.
- Put Bean Validation annotations on request DTOs.

## Naming

- Use PascalCase for Java classes and React components.
- Use camelCase for Java methods and fields.
- Use kebab-case for React file names.
- Name Flyway migrations `V<n>__snake_case_description.sql`.

## Testing

- Use JUnit 5 and AssertJ.
- Do not use Mockito for value objects.
- Use sentence-style test names, such as `shouldRejectApplicationBelowMinimumAmount`.
- Use Arrange, Act, and Assert blocks. Put a blank line between the blocks.
- Use `@WebMvcTest` and MockMvc for controller tests.
