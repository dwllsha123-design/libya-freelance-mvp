# Proposal Acceptance Concurrency

## Problem

Two parallel `POST /proposals/:id/accept` requests must not accept two freelancers for the same project.

## Solution (layered)

### 1. Application transaction with conditional updates

`ProposalsService.accept()` runs inside `prisma.$transaction`:

1. `project.updateMany({ where: { id, status: OPEN, acceptedProposalId: null } })` — only one concurrent request succeeds when transitioning to `IN_PROGRESS`.
2. `proposal.updateMany({ where: { id, status: PENDING } })` — accepts only if still pending.
3. `proposal.updateMany` rejects other `PENDING` proposals on the same project.

If step 1 updates `count === 0`, the transaction throws `ConflictException`.

### 2. Database partial unique index

Migration `20250901210000_phase_d_proposals`:

```sql
CREATE UNIQUE INDEX "Proposal_one_accepted_per_project"
  ON "Proposal"("projectId")
  WHERE status = 'ACCEPTED';
```

This enforces **at most one ACCEPTED proposal per project** even if application logic regresses.

### 3. Project invariant

`Project.acceptedProposalId` is set atomically with `IN_PROGRESS` status, linking the single accepted engagement.

## E2E verification

`proposals.e2e-spec.ts` includes a concurrency test firing two accept requests in parallel; exactly one succeeds.

## Race outcome

| Scenario | Result |
|----------|--------|
| Two accepts on different PENDING proposals | One 201, one 409 |
| Accept after project already IN_PROGRESS | 409 |
| Accept non-PENDING proposal | 409 |
