---
name: feature-close
description: Prepare PR and acceptance records after feature review passes.
---

Read the [canonical workflow](../../../.claude/commands/feature-close.md) in
full. Follow it.

Invoke as `$feature-close NN`. Replace each `$1` in the canonical workflow
with `NN`. Its allowed tools, documentation-only rule, and stop conditions are
binding. A security reviewer exists if either
`.claude/agents/security-reviewer.md` or
`.codex/agents/security-reviewer.toml` exists.
