# Flow

This file gives the calling order for one feature. It gives no other
information. Read `README.md` for the full explanation.

The example uses task `04`. Use your own task number in its place.

Claude types `/skill-name NN`. Codex types `$skill-name NN`. The rest of each
instruction is the same for both.

## Order

| # | You type | You get |
|---|---|---|
| 1 | `/business-analyst 04` | `docs/features/04/04-acceptance.md` |
| 🚦 | **Read the file. Edit it if needed.** Can you name the test for every criterion? | |
| 2 | `/architect 04` | `docs/features/04/04-adr.md` |
| 🚦 | **Read the file.** Read the *implications for code* section first. | |
| 3 | `/feature-kickoff 04` | `docs/features/04/04-plan-request.md` |
| 4 | Press **Shift+Tab**. Then type `Plan the work in @docs/features/04/04-plan-request.md` | a plan, in the chat |
| 5 | `/feature-plan 04` | `docs/features/04/04-plan.md` |
| 🚦 | **Read the plan.** Find the vaguest task. Sharpen it. | |
| 6 | `Use the spec-guardian subagent to check docs/features/04/04-plan.md against docs/features/04/04-acceptance.md` | GO or NO-GO |
| 🚦 | **Accept the verdict, or reject it.** On NO-GO, stop. | |
| 7 | `Use the implementer subagent to build docs/features/04/04-plan.md` | migration, backend, and React code |
| 🚦 | **Read the diff.** Do not skim it. | |
| 8 | `Use the test-verifier subagent to verify task 04` | tests, and a `./verify.sh` result |
| 🚦 | **Did the suite genuinely pass?** | |
| 9 | `Use the code-reviewer subagent to review the diff for task 04` | findings |
| 10 | `Use the security-reviewer subagent to review the diff for task 04` † | findings |
| 🚦 | **Which findings do you fix?** Fix every HIGH and MEDIUM finding. | |
| 11 | `Use the implementer subagent to fix every HIGH and MEDIUM finding above. Change nothing else.` | fixes |
| 12 | `Use the test-verifier subagent to verify task 04` | a second passing result |
| 13 | `/feature-close 04` | `04-PR.md`, ticked criteria, suggested git commands |

† `security-reviewer` does not exist yet. `.claude/agents/` ships four agents,
not five. You must write the fifth agent in a later task. Until you write it,
no step reviews your diff for security. `/feature-close` states this.

## Why this order

**Write the documents before the plan.** `spec-guardian` judges the plan
against `04-acceptance.md`. Write the criteria first. Otherwise the plan has
no standard to meet.

**Write the plan before the code.** `spec-guardian` takes about a minute to
run. If you skip it, `code-reviewer` can find the same gap later. By then you
have already written the code. You must rewrite it.

**Write the tests before the review.** `code-reviewer` must review a complete
feature, not a partial one. Do not review code that still fails its tests.
The review gives you less information when the code is not finished.

**Fix the findings before you close.** `/feature-close` stops the close in
four cases: `verify.sh` fails, a HIGH finding remains, the branch is `main`,
or the diff is missing a layer.

## Rules that do not change

- Each agent ends its output with your next line. You can copy it. You do not
  have to copy it.
- No step starts on its own. You must type each instruction yourself.
- Every 🚦 needs your decision. Do not skip a gate. If you skip every gate, an
  agent writes unreviewed code into a banking system.
- Use one branch for each feature. Find the branch name at the top of the
  task file.

## Or, in one line

```
/orchestrator 04
```

This runs the same thirteen steps and stops at the same seven gates. It types
each instruction for you. You still decide at every 🚦. It stops and asks a
question at each gate. No step moves past a gate until you answer.

You can stop at a gate to edit a document by hand. Run `/orchestrator 04`
again afterward. It reads what already exists in `docs/features/04/` and
continues from there.

Do the flow by hand at least once first. The orchestrator saves you the
typing. It cannot read a diff for you, and it cannot decide a gate for you.
