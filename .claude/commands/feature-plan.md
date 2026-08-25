---
description: Save a reviewed feature plan to its numbered plan file.
argument-hint: <task-number, e.g. 01>
allowed-tools: Write
---

# Task

Copy the plan already produced in this conversation to
`docs/features/$1/$1-plan.md`, verbatim. Create only this file.

# Precondition

There must be a plan in this conversation from plan mode or from `/orchestrator`
using the `Plan` subagent. If no such plan exists, stop and say so. Do not write
a plan.

# Rules

- Copy the plan exactly. Do not plan, reorder, summarize, expand, or improve it.
- Keep the planner task numbers exactly.
- Do not write code, tests, or migrations.
- Do not change another file.

# Output

The file contains the plan only. Do not add a preamble, note, or summary.

In chat, report only the path and the number of plan tasks.

# Verify

- The file contains every plan task with the planner numbering.
- No text was added or changed.
- No other file changed.
