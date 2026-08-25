# Flow

The calling order, nothing else. Full explanation is in `README.md`.

Example uses task **04** — swap the number.

Claude uses `/skill-name NN`. Codex uses `$skill-name NN`. The remaining
instructions are the same.

## Order

| # | You type | You get |
|---|---|---|
| 1 | `/business-analyst 04` | `docs/features/04/04-acceptance.md` |
| 🚦 | **Read it. Edit it.** Can you name the test for every criterion? | |
| 2 | `/architect 04` | `docs/features/04/04-adr.md` |
| 🚦 | **Read it** — especially *implications for code* | |
| 3 | `/feature-kickoff 04` | `docs/features/04/04-plan-request.md` |
| 4 | **Shift+Tab**, then `Plan the work in @docs/features/04/04-plan-request.md` | a plan, in the chat |
| 5 | `/feature-plan 04` | `docs/features/04/04-plan.md` |
| 🚦 | **Read the plan.** Find the vaguest task and sharpen it | |
| 6 | `Use the spec-guardian subagent to check docs/features/04/04-plan.md against docs/features/04/04-acceptance.md` | GO / NO-GO |
| 🚦 | **Accept the verdict, or don't.** NO-GO means stop | |
| 7 | `Use the implementer subagent to build docs/features/04/04-plan.md` | migration · backend · React |
| 🚦 | **Read the diff.** Read, not skim | |
| 8 | `Use the test-verifier subagent to verify task 04` | tests + `./verify.sh` |
| 🚦 | **Is it genuinely green?** | |
| 9 | `Use the code-reviewer subagent to review the diff for task 04` | findings |
| 10 | `Use the security-reviewer subagent to review the diff for task 04` † | findings |
| 🚦 | **Which findings am I fixing?** HIGH and MEDIUM always | |
| 11 | `Use the implementer subagent to fix every HIGH and MEDIUM finding above. Change nothing else.` | fixes |
| 12 | `Use the test-verifier subagent to verify task 04` | still green |
| 13 | `/feature-close 04` | `04-PR.md`, criteria ticked, git commands |

† `security-reviewer` does not exist yet — `.claude/agents/` ships with four.
You write the fifth; that is a later task. Until you do, nothing reviews your
diff for security, and `/feature-close` will say so.

## Why this order

**Documents before plan.** The plan is judged against `04-acceptance.md`. Write
the criteria first or the plan has nothing to be wrong about.

**Plan before code.** `spec-guardian` costs a minute. Finding the same gap at
`code-reviewer` costs the twenty minutes you spent implementing it.

**Tests before review.** `code-reviewer` reviews a working feature, not a
half-built one. Reviewing red code wastes the review.

**Fixes before close.** `/feature-close` refuses on red `verify.sh`, on HIGH
findings, on `main`, or when the diff misses a layer.

## Rules that don't change

- Each agent ends by printing your next line. Copy it — or don't.
- Nothing runs until you send it. There are no buttons.
- Every 🚦 is yours. Skip them all and you have a machine writing unreviewed
  code into a banking system.
- One branch per feature. The name is at the top of the task file.

## Or, in one line

```
/orchestrator 04
```

The same thirteen steps, the same seven gates — it types them, you still decide
at every 🚦. It stops and asks; nothing moves past a gate without your answer.

Stop at a gate to hand-edit a document, then run `/orchestrator 04` again — it
sees what is already in `docs/features/04/` and picks up from there.

Do the flow by hand first. The orchestrator saves you the copy-pasting, and it
cannot save you from a gate you wave through.
