# Proposal Acceptance Invariant

## Final invariant

**A project may have at most one `ACCEPTED` proposal.**

## Enforcement layers

### 1. Partial unique index (database)

```sql
CREATE UNIQUE INDEX "Proposal_one_accepted_per_project"
  ON "Proposal"("projectId")
  WHERE status = 'ACCEPTED';
```

Prevents two proposals on the same project from both being `ACCEPTED`.

### 2. `Project.acceptedProposalId` (application + FK)

- **Exists in schema:** `Project.acceptedProposalId String? @unique`
- **Exists in migration:** `20250901180000_init` — column, unique index, FK to `Proposal(id)`
- **Relation:** `Project.acceptedProposal` ↔ `Proposal.acceptedForProject` (`@relation("AcceptedProposal")`)

**Why it is not redundant:**

| Mechanism | Purpose |
|-----------|---------|
| Partial unique index | Hard guarantee: ≤1 ACCEPTED per project |
| `acceptedProposalId` | O(1) lookup of active engagement; concurrency guard (`acceptedProposalId: null` in conditional `updateMany`) |

### 3. Transactional accept flow

`ProposalsService.accept()` atomically:

1. Updates project only if `status = OPEN` **and** `acceptedProposalId IS NULL`
2. Accepts proposal only if `PENDING` **and** `projectId` matches
3. Rejects other `PENDING` proposals on same project
4. Sets `acceptedProposalId` via `ProjectStateService.transitionToInProgress(proposalId)`

### Cross-project consistency

The FK ensures `acceptedProposalId` references a valid `Proposal.id`. Application code additionally requires `proposal.projectId === project.id` in the accept `updateMany` filter.

PostgreSQL does not enforce that the referenced proposal belongs to the same project row; that invariant is maintained only by the accept transaction. Manual DB edits could violate this — production operations should not bypass application logic.

## Conclusion

`acceptedProposalId` is **necessary and intentional** — not added merely for convenience. It complements the partial unique index for concurrency-safe `OPEN → IN_PROGRESS` transitions.
