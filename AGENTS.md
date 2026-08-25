# PayFlow Codex rules

Read `CLAUDE.md` before you do work in this repository. It is the source for
project rules. A feature ADR takes precedence when it conflicts with that file.

## Codex workflow

- Use repository skills from `.agents/skills/`.
- Use project agents from `.codex/agents/`.
- Use the named project agent when a workflow requests one.
- Run `$orchestrator` in a Sol parent session.
- Use the model in each project agent file for delegated work.
- Use `.claude/` as the source for shared workflow instructions.
- Use `.github/workflows/ci.yml` as the common CI gate. Do not make a separate
  Codex workflow.

## Code Review Rules

- Apply `CLAUDE.md` and the applicable feature ADR.
- Run `code-reviewer` after all tests pass.
- Give a file and line for each finding.
- Do not report a security review as passed when no security review occurred.
