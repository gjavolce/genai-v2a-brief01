# PayFlow — Your Tasks

Eleven tasks. Task 00 builds the two tools you use for all the others.

| # | Task | Branch | Difficulty |
|---|---|---|---|
| **00** | **Build the `business-analyst` and `architect` skills** | `task/00-analysis-skills` | — |
| 01 | View my accounts | `feature/01-view-accounts` | Easy |
| 02 | View transaction history | `feature/02-transaction-history` | Easy |
| 03 | Filter transaction history | `feature/03-filter-transactions` | Easy |
| 04 | Transfer between my own accounts | `feature/04-internal-transfer` | Medium |
| 05 | Manage payees | `feature/05-payees` | Medium |
| 06 | Pay a payee | `feature/06-external-payment` | Medium |
| 07 | Enforce the daily payment limit | `feature/07-daily-limit` | Medium |
| 08 | Hold large payments for approval | `feature/08-approval` | Hard |
| 09 | Standing orders | `feature/09-standing-orders` | Hard |
| 10 | Statement export and audit search | `feature/10-statement-audit` | Hard |

Do them in order — each builds on the last.

**You will not finish all ten.** Three is a good day. The rest are yours to take
home, and they are written well enough to build on Monday.

The loop for every feature is in the README. Two things it insists on:

- **Every feature is its own branch.** The name is in the task file.
- **Every feature goes all the way down** — migration, backend, React page. A
  feature that stops at the API is not done, and `./verify.sh` will say so.
