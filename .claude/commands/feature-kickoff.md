---
description: Write the plan request for a numbered feature.
argument-hint: <task-number, e.g. 01>
allowed-tools: Read, Grep, Glob, Write
---

# Task

Write the plan request for task `$1`. Do not write a plan or code.
Create or update only `docs/features/$1/$1-plan-request.md`.

# Read in this order

1. `docs/tasks/$1-*.md` — business requirement.
2. `docs/features/$1/$1-acceptance.md` — functional requirements and acceptance criteria.
3. `docs/features/$1/$1-adr.md` — decisions, non-functional requirements, and code rules.
4. `api/src/main/java/**/customer/**` — reference slice and local conventions.

If `acceptance.md` or `adr.md` is missing, stop. Name the missing file. Tell
the human to run `/business-analyst $1` or `/architect $1` first. Do not create
missing content.

# File content

Write these six `##` sections, in this order:

1. **What must exist when this is done** — describe the capability in one or two sentences.
2. **Scope** — name included folders and layers. Include a non-empty out-of-scope list.
3. **Acceptance criteria** — copy from `acceptance.md` verbatim. Do not paraphrase or renumber.
4. **Rules from the ADR** — quote the ADR section `implications for code`. Cite the ADR by name.
5. **Full stack** — name database, backend, and frontend changes. All three layers are required.
6. **Banking obligations** — state whether money, authorization, audit, and idempotency apply. State which do not apply.

The file must be complete input for plan mode. Do not add a preamble, notes,
questions, or reasoning.

# Report

In chat, report only:

- the file path;
- interpretations you made;
- acceptance criteria that appear untestable.

Put these observations in chat, not in the file.

# Verify

- The file is `docs/features/$1/$1-plan-request.md`.
- Every acceptance criterion is word-for-word identical.
- The out-of-scope list is non-empty.
- The ADR name and quoted code rules are present.
- Database, backend, and frontend are named.
- Banking obligations are explicit.
- No other file changed.
