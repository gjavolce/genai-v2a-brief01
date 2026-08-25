---
name: orchestrator
description: Run the gated PayFlow workflow for a numbered feature.
---

Read the [canonical workflow](../../../.claude/skills/orchestrator/SKILL.md) in
full. Follow it. Its seven gates, stop rules, ownership rules, and ban on commit,
push, and PR commands are binding.

Codex rules:

- Invoke as `$orchestrator NN`. Use `NN` where the canonical workflow uses `/orchestrator NN`.
- Invoke workflows as Codex skills: `$business-analyst`, `$architect`, `$feature-kickoff`, `$feature-plan`, and `$feature-close`.
- Use the project `planner` agent for the canonical `Plan` subagent.
- Use project agents for `spec-guardian`, `implementer`, `test-verifier`, and `code-reviewer`.
- Use `.codex/agents/security-reviewer.toml` when it exists.
- If only `.claude/agents/security-reviewer.md` exists, start a read-only Terra
  subagent. Tell it to read that file as its role contract.
- If neither file exists, no security reviewer exists.
- A canonical instruction to use a subagent authorizes that bounded delegation. Wait for its result before the next gate.
