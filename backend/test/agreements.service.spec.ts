import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  AgreementPartyRole,
  ProjectAgreementStatus,
  ProjectStatus,
  ProposalStatus,
} from '@prisma/client';
import { AgreementsService } from '../src/agreements/agreements.service.js';

function createPrismaMock() {
  return {
    proposal: {
      findUnique: vi.fn(),
    },
    projectAgreement: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    agreementVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    agreementAcceptance: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    agreementMilestone: {
      create: vi.fn(),
    },
    agreementChangeRequest: {
      create: vi.fn(),
      update: vi.fn(),
    },
    agreementAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    escrow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('AgreementsService', () => {
  const prisma = createPrismaMock();
  const notifications = { create: vi.fn() };
  const commission = {
    resolveForProject: vi.fn().mockResolvedValue({
      commissionPercent: 10,
      platformFee: 100,
      freelancerPayout: 900,
      source: 'PLATFORM_DEFAULT',
      platformCommissionPolicyId: null,
      categoryCommissionOverrideId: null,
      projectCommissionOverrideId: null,
      minimumCommissionAmount: null,
      maximumCommissionAmount: null,
    }),
  };

  let service: AgreementsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgreementsService(
      prisma as never,
      notifications as never,
      commission as never,
    );
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
  });

  it('creates agreement from pending proposal with fee snapshot', async () => {
    prisma.proposal.findUnique.mockResolvedValue({
      id: 'prop-1',
      status: ProposalStatus.PENDING,
      coverLetter: 'سأسلم الموقع خلال 10 أيام',
      proposedPrice: 1000,
      estimatedDurationDays: 10,
      freelancerId: 'fr-1',
      projectId: 'proj-1',
      project: {
        id: 'proj-1',
        title: 'موقع شركة',
        description: 'بناء موقع تعريفي',
        clientId: 'cl-1',
        status: ProjectStatus.OPEN,
        acceptedProposalId: null,
      },
      freelancer: { profile: { firstName: 'أ', lastName: 'ب', username: 'ab' } },
    });
    prisma.projectAgreement.findUnique.mockResolvedValue(null);
    prisma.projectAgreement.findFirst.mockResolvedValue(null);
    prisma.projectAgreement.create.mockResolvedValue({ id: 'agr-1' });
    prisma.agreementVersion.create.mockResolvedValue({
      id: 'ver-1',
      versionNumber: 1,
    });
    prisma.projectAgreement.update.mockResolvedValue({});
    prisma.agreementMilestone.create.mockResolvedValue({});
    prisma.agreementAuditLog.create.mockResolvedValue({});

    vi.spyOn(service, 'getForParticipant').mockResolvedValue({
      id: 'agr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
    } as never);

    const result = await service.createFromProposal('cl-1', 'prop-1');

    expect(result.id).toBe('agr-1');
    expect(commission.resolveForProject).toHaveBeenCalledWith('proj-1', 1000);
    expect(prisma.agreementVersion.create).toHaveBeenCalled();
    const versionData = prisma.agreementVersion.create.mock.calls[0][0].data;
    expect(Number(versionData.grossAmount)).toBe(1000);
    expect(Number(versionData.platformFee)).toBe(100);
    expect(Number(versionData.freelancerNet)).toBe(900);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('prevents duplicate agreement for same proposal', async () => {
    prisma.proposal.findUnique.mockResolvedValue({
      id: 'prop-1',
      status: ProposalStatus.PENDING,
      coverLetter: 'x',
      proposedPrice: 1000,
      estimatedDurationDays: 5,
      freelancerId: 'fr-1',
      projectId: 'proj-1',
      project: {
        clientId: 'cl-1',
        status: ProjectStatus.OPEN,
        acceptedProposalId: null,
        title: 't',
        description: 'd',
      },
      freelancer: { profile: null },
    });
    prisma.projectAgreement.findUnique.mockResolvedValue({ id: 'agr-existing' });

    await expect(service.createFromProposal('cl-1', 'prop-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects unauthorized acceptance', async () => {
    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      clientId: 'cl-1',
      freelancerId: 'fr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
      currentVersionId: 'ver-1',
      currentVersion: { acceptances: [] },
      project: { title: 't' },
    });

    await expect(service.accept('agr-1', 'stranger')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('approves only after both parties accept and is idempotent', async () => {
    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      clientId: 'cl-1',
      freelancerId: 'fr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
      currentVersionId: 'ver-1',
      currentVersion: { acceptances: [] },
      project: { title: 't' },
    });
    prisma.agreementAcceptance.create.mockResolvedValue({});
    prisma.agreementAuditLog.create.mockResolvedValue({});
    prisma.agreementAcceptance.findMany.mockResolvedValue([
      { role: AgreementPartyRole.CLIENT, userId: 'cl-1' },
    ]);
    prisma.projectAgreement.update.mockResolvedValue({});
    vi.spyOn(service, 'getForParticipant').mockResolvedValue({
      id: 'agr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
      iAccepted: true,
    } as never);

    await service.accept('agr-1', 'cl-1');
    expect(prisma.projectAgreement.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectAgreementStatus.APPROVED }),
      }),
    );

    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      clientId: 'cl-1',
      freelancerId: 'fr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
      currentVersionId: 'ver-1',
      currentVersion: {
        acceptances: [{ userId: 'cl-1', role: AgreementPartyRole.CLIENT }],
      },
      project: { title: 't' },
    });
    prisma.agreementAcceptance.findMany.mockResolvedValue([
      { role: AgreementPartyRole.CLIENT, userId: 'cl-1' },
      { role: AgreementPartyRole.FREELANCER, userId: 'fr-1' },
    ]);

    await service.accept('agr-1', 'fr-1');
    expect(prisma.projectAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectAgreementStatus.APPROVED }),
      }),
    );

    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      clientId: 'cl-1',
      freelancerId: 'fr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
      currentVersionId: 'ver-1',
      currentVersion: {
        acceptances: [{ userId: 'fr-1', role: AgreementPartyRole.FREELANCER }],
      },
      project: { title: 't' },
    });
    vi.spyOn(service, 'getForParticipant').mockResolvedValue({
      id: 'agr-1',
      iAccepted: true,
    } as never);
    await service.accept('agr-1', 'fr-1');
    expect(prisma.agreementAcceptance.create).toHaveBeenCalledTimes(2);
  });

  it('blocks funding without approved agreement', async () => {
    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      status: ProjectAgreementStatus.PENDING_APPROVAL,
    });
    await expect(service.assertApprovedForFunding('prop-1')).rejects.toBeInstanceOf(
      PreconditionFailedException,
    );
  });

  it('change request creates new version and resets approval', async () => {
    prisma.projectAgreement.findUnique.mockResolvedValue({
      id: 'agr-1',
      projectId: 'proj-1',
      clientId: 'cl-1',
      freelancerId: 'fr-1',
      status: ProjectAgreementStatus.APPROVED,
      currentVersion: {
        id: 'ver-1',
        versionNumber: 1,
        title: 't',
        scope: 's',
        deliverables: 'd',
        grossAmount: 1000,
        durationDays: 10,
        revisionCount: 2,
      },
      project: { title: 'مشروع' },
    });
    prisma.agreementChangeRequest.create.mockResolvedValue({ id: 'chg-1' });
    prisma.agreementVersion.create.mockResolvedValue({ id: 'ver-2', versionNumber: 2 });
    prisma.agreementChangeRequest.update.mockResolvedValue({});
    prisma.projectAgreement.update.mockResolvedValue({});
    prisma.agreementMilestone.create.mockResolvedValue({});
    prisma.agreementAuditLog.create.mockResolvedValue({});
    vi.spyOn(service, 'getForParticipant').mockResolvedValue({ id: 'agr-1' } as never);

    await service.requestChange('agr-1', 'cl-1', {
      changeType: 'PRICE',
      reason: 'أحتاج تخفيض السعر قليلاً',
      proposedGrossAmount: 800,
    });

    expect(prisma.agreementVersion.create).toHaveBeenCalled();
    const data = prisma.agreementVersion.create.mock.calls[0][0].data;
    expect(data.versionNumber).toBe(2);
    expect(Number(data.grossAmount)).toBe(800);
    expect(prisma.projectAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectAgreementStatus.PENDING_APPROVAL,
          approvedAt: null,
        }),
      }),
    );
  });
});
