| Criterion | Covered by | Status |
|---|---|---|
| `AC-01-1.1` | Tasks 3–6 | ✅ |
| `AC-01-1.2` | Tasks 5–6 | ✅ |
| `AC-01-1.3` | Task 5 | ✅ |
| `AC-01-2.1` | Tasks 1, 4–5 | ✅ |
| `AC-01-2.2` | Tasks 1, 4–5 | ✅ |
| `AC-01-2.3` | Tasks 1, 4–6 | ✅ |
| `AC-01-3.1` | Tasks 2, 3, 5, 7 | ✅ |
| `AC-01-3.2` | Tasks 2, 3, 5, 7 | ✅ |
| `AC-01-3.3` | Tasks 5, 7 | ✅ |
| `AC-01-4.1` | Tasks 2, 4–5, 7 | ✅ |
| `AC-01-4.2` | Tasks 2, 5, 7 | ✅ |
| `AC-01-4.3` | Tasks 2, 5, 7 | ✅ |

1. Steps 1, 2, and 8 are vague and do not name files, classes, or methods. Remedy: identify the exact implementation files/classes/methods and verification targets.
2. Step 2 includes account ordering, partial-load behavior, and read-audit policy, which are unresolved business questions and have no acceptance criterion. Remedy: record these as explicit decisions or defer them without expanding implementation scope.

**NO-GO** — identify concrete implementation targets for the vague steps before coding.

Revise `docs/features/01/01-plan.md` to close these gaps. Do not write code.