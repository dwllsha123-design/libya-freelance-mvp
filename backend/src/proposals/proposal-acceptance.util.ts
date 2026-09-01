import { ConflictException } from '@nestjs/common';
import { Prisma, ProjectStatus, ProposalStatus } from '@prisma/client';
import { ProjectStateService } from '../projects/project-validation.util.js';
import { ProposalStateService } from './proposal-validation.util.js';

export async function acceptProposalInTransaction(
  tx: Prisma.TransactionClient,
  proposalId: string,
  projectId: string,
) {
  const projectUpdate = await tx.project.updateMany({
    where: {
      id: projectId,
      status: ProjectStatus.OPEN,
      acceptedProposalId: null,
    },
    data: ProjectStateService.transitionToInProgress(proposalId),
  });

  if (projectUpdate.count === 0) {
    throw new ConflictException('المشروع لم يعد يقبل قبول عروض');
  }

  const accepted = await tx.proposal.updateMany({
    where: {
      id: proposalId,
      status: ProposalStatus.PENDING,
      projectId,
    },
    data: ProposalStateService.transitionToAccepted(),
  });

  if (accepted.count === 0) {
    throw new ConflictException('العرض لم يعد متاحاً للقبول');
  }

  const rejected = await tx.proposal.updateMany({
    where: {
      projectId,
      status: ProposalStatus.PENDING,
      id: { not: proposalId },
    },
    data: ProposalStateService.transitionToRejected(),
  });

  return { rejectedCount: rejected.count };
}
