---
description: Save the plan from this conversation to docs/features/NN/NN-plan.md
argument-hint: <task-number, e.g. 01>
allowed-tools: Write
---

# Task

Write the plan produced earlier in this conversation to
`docs/features/$1/$1-plan.md`, verbatim.

That file is the only thing you create.

# Stop first if this is untrue

There is a plan in this conversation, produced by plan mode.

If there is not — a new thread, a cleared one, a plan that was never made — say
so and stop. **Do not write one.** A plan nobody reviewed is worth less than no
plan at all, because it arrives wearing the approval the real one earned.

# Constraints

- **Verbatim.** Copy the plan as it stands. Do not re-plan, reorder, summarise,
  expand, or improve a task on the way past. If a task is vague it stays vague
  — that is mine to catch at the next gate, and `spec-guardian`'s to catch
  after me.
- Keep the planner's task numbering exactly. `spec-guardian` reports against
  those numbers, and so does `code-reviewer` when it checks for scope drift.
- Do not write code, tests or migrations. This step is a transcription.
- Do not touch any other file.

# Expected output

`docs/features/$1/$1-plan.md` — the plan and nothing else. No preamble, no note
from you, no summary of what you just did.

Then tell me the path and how many tasks the plan contains. Nothing more.

# Verification

- The file holds every task from the plan, under the planner's numbering.
- Not a word of it is yours.
- Nothing outside that one file was created or modified.
