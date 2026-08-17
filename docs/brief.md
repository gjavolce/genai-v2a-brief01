# PayFlow — Retail Payments

**Client:** Meridian Bank UK — Retail Banking
**Sponsor:** Head of Everyday Banking

## Background

Meridian's customers can see their accounts in the mobile app but cannot move
money without calling the contact centre or visiting a branch. Around 40% of
contact-centre volume is people asking to make a transfer or set up a regular
payment — work that costs us money and irritates the customer.

Competitors have offered self-service payments for a decade. This is a gap, not
an innovation.

## What we want

A web application where a customer can see their accounts and transactions, move
money between their own accounts, pay someone else, and set up regular payments
that go out automatically.

## Users

**Customer** — sees their own accounts, moves their own money.
**Operations officer** — investigates payment problems, approves payments above
the automatic limit, reads the audit trail.

## Rules as they stand today

- Daily payment limit: £10,000 per customer across all external payments.
- Payments over £5,000 require operations approval before they leave.
- Standing orders run monthly, on a day of the month the customer chooses.
- A customer may hold several accounts. Transfers between their own accounts are
  not subject to the daily limit.
- Accounts may not go overdrawn. A payment that would overdraw is rejected.

## Constraints

- Regulated UK bank. Every movement of money must be reconstructable afterwards.
- Account numbers and personal data must not appear in application logs.
- Works against existing customer records — we are not rebuilding customer
  management.

## Where you're starting

The customer records already exist and are already visible in the application.
Everything else on this page is yours to build.

## Out of scope

Mobile app · international payments · currency conversion · direct debits ·
overdrafts · account opening and closing.
