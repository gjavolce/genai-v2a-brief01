# Test instructions — STE wording fixes in the orchestrator prompts

## Purpose

Confirm two things about the 2026-08-26 edit to `.claude/agents/`,
`.claude/commands/`, and `.claude/skills/`:

1. The files follow ASD-STE100 rules.
2. The gate 4 waiver offer works, and no agent behavior broke.

## Scope

These seven files changed. No other file changed.

- `.claude/agents/code-reviewer.md`
- `.claude/agents/test-verifier.md`
- `.claude/commands/feature-close.md`
- `.claude/commands/feature-kickoff.md`
- `.claude/skills/architect/SKILL.md`
- `.claude/skills/business-analyst/SKILL.md`
- `.claude/skills/orchestrator/SKILL.md`

## Before you start

Run this command. Confirm it lists only the seven files above.

```
git status --short -- .claude
```

If another file appears, stop. Report the extra file before you continue.

## Test 1 — Check the wording

Run this command. It must print no output.

```
grep -rn '\bgreen\b\|\bNever\b\|swallow\|soften\|authorisation\|behaviour\|You may\b\|\bthe user\b' \
  .claude/agents .claude/commands .claude/skills
```

A match means a forbidden word remains. Name the file and line, and fix it.

## Test 2 — Read the diff by hand

Run this command.

```
git diff -- .claude
```

Check each hunk against this list:

- Every sentence gives one instruction.
- Every fenced code block is unchanged. Compare it against the version before
  the edit. A hand-off command, such as `Use the code-reviewer subagent to
  review the diff for task NN`, must match byte for byte. Other tools depend
  on this exact text.
- No hunk adds a preamble, a summary, or a repeated instruction.

## Test 3 — Dry-run one read-only agent

Use `spec-guardian`. It is read-only and low-cost.

Run this in Claude Code:

```
Use the spec-guardian subagent to check docs/features/02/02-plan.md against docs/features/02/02-acceptance.md
```

Check the output:

- It uses `authorization`, not `authorisation`.
- It ends with `GO` or `NO-GO`, in the original table-and-verdict format.
- It contains no new preamble or narration.

## Test 4 — Resume the live orchestrator run

`docs/features/02/` already has an acceptance file, an ADR, a plan request,
and a plan. This means task 02 already passed gates 1 through 4. Use this
state to test the gate 4 change.

Run:

```
/orchestrator 02
```

Check the output:

- The startup step lists the existing files in `docs/features/02/` and asks
  where to resume. Do not let it overwrite a file you did not ask it to
  change.
- If it reaches gate 4, it now offers the gate 5 waiver at the same time as
  the coverage verdict. Confirm both appear in one message, not two.
- If it reaches gate 6, the text asks "Did the suite genuinely pass?" and
  never uses the word "green".
- If it reaches gate 7, the text says "lower a HIGH finding to a lower
  severity", not "soften a HIGH".

Stop at the first gate after you confirm the relevant wording. You do not
need to finish the whole run to complete this test.

## Test 5 — Automation compatibility (optional)

The `automation/n8n/` directory exists only on the `chore/n8n-orchestrator`
branch. Skip this test unless you need to confirm n8n compatibility.

1. Ask before you switch branches. The current branch may hold other
   in-progress work.
2. On `chore/n8n-orchestrator`, carry your `.claude/` edits over with `git
   stash` and `git stash pop`, or with a cherry-pick.
3. Run:

   ```
   cd automation/n8n && npm test
   ```

4. Confirm `prompts.test.mjs` and `evidence.test.mjs` still pass. They assert
   on the exact hand-off strings named in Test 2.

## Done when

- Test 1 prints no output.
- Test 2 shows no changed code fence.
- Test 3 and Test 4 show the new wording in live agent output.
- Test 5 passes, if you ran it.
