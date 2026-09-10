import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FreelancerAvailability, WorkMode } from '@prisma/client';
import { ProfilesService } from '../src/profiles/profiles.service.js';
import {
  categoryHasSkillMapping,
  skillSlugsForCategory,
} from '../src/profiles/freelancer-category-skills.js';

function buildService(prisma: unknown) {
  return new ProfilesService(
    prisma as never,
    { uploadProfileImage: vi.fn(), deleteFile: vi.fn() } as never,
    { listForFreelancerUsername: vi.fn() } as never,
    { getRatingSummary: vi.fn() } as never,
    { checkProfileComplete: vi.fn() } as never,
    { recordProfileView: vi.fn() } as never,
    {
      getPresenceBatch: vi.fn().mockResolvedValue([]),
      getOnlineUserIds: vi.fn().mockResolvedValue([]),
    } as never,
    { resolveProjectWorkMode: vi.fn() } as never,
  );
}

describe('freelancer category soft map', () => {
  it('documents mapped vs unmapped categories', () => {
    expect(skillSlugsForCategory('programming-tech')).toContain('react');
    expect(categoryHasSkillMapping('programming-tech')).toBe(true);
    expect(categoryHasSkillMapping('photography')).toBe(false);
    expect(categoryHasSkillMapping('engineering-architecture')).toBe(false);
    expect(categoryHasSkillMapping('voice-over')).toBe(false);
    expect(categoryHasSkillMapping('education-training')).toBe(false);
    expect(categoryHasSkillMapping('consulting')).toBe(false);
    expect(categoryHasSkillMapping('unknown-slug')).toBe(false);
  });
});

describe('ProfilesService.listFreelancers corrections', () => {
  const findMany = vi.fn();
  const count = vi.fn();
  let service: ProfilesService;

  beforeEach(() => {
    findMany.mockReset();
    count.mockReset();
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    service = buildService({
      profile: { findMany, count },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    });
  });

  it('verified filter uses identity verification KYC, not profile completeness', async () => {
    await service.listFreelancers({
      page: 1,
      limit: 12,
      verified: true,
    });

    const arg = findMany.mock.calls[0][0];
    const serialized = JSON.stringify(arg.where);
    expect(serialized).toContain('identityVerification');
    expect(serialized).toContain('VERIFIED');
    expect(serialized).not.toContain('averageRating');
    expect(serialized).not.toContain('emailVerified');
  });

  it('unmapped category returns empty without querying the full directory', async () => {
    const result = await service.listFreelancers({
      page: 1,
      limit: 12,
      category: 'photography',
    });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta).toMatchObject({ categoryMapping: 'unavailable' });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('drops rows without username so cards cannot link to /u/undefined', async () => {
    findMany.mockResolvedValue([
      {
        id: 'p1',
        userId: 'u1',
        username: '',
        firstName: 'No',
        lastName: 'Name',
        profilePhoto: null,
        bio: null,
        phone: null,
        city: null,
        country: 'Libya',
        workMode: 'REMOTE',
        freelancerProfile: {
          professionalTitle: 'Dev',
          availability: 'AVAILABLE',
          hourlyRate: null,
          completedProjects: 0,
          averageRating: 0,
          skills: [],
          performanceLevel: 'NONE',
          isVerifiedTalent: false,
          isFoundingFreelancer: false,
        },
        clientProfile: null,
        user: {
          id: 'u1',
          email: 'x@y.com',
          role: 'FREELANCER',
          status: 'ACTIVE',
          emailVerified: true,
          createdAt: new Date(),
          lastSeenAt: null,
          presenceVisibility: 'EVERYONE',
          identityVerification: null,
          freelancerSubscriptions: [],
          _count: { reviewsReceived: 0 },
        },
      },
      {
        id: 'p2',
        userId: 'u2',
        username: 'ahmed-dev',
        firstName: 'Ahmed',
        lastName: 'Ali',
        profilePhoto: null,
        bio: 'Bio text long enough for nothing special.',
        phone: '091',
        city: null,
        country: 'Libya',
        workMode: WorkMode.REMOTE,
        freelancerProfile: {
          professionalTitle: 'Full Stack',
          availability: FreelancerAvailability.AVAILABLE,
          hourlyRate: null,
          completedProjects: 1,
          averageRating: 4.5,
          skills: [],
          performanceLevel: 'NONE',
          isVerifiedTalent: false,
          isFoundingFreelancer: false,
        },
        clientProfile: null,
        user: {
          id: 'u2',
          email: 'a@b.com',
          role: 'FREELANCER',
          status: 'ACTIVE',
          emailVerified: true,
          createdAt: new Date(),
          lastSeenAt: null,
          presenceVisibility: 'EVERYONE',
          identityVerification: null,
          freelancerSubscriptions: [],
          _count: { reviewsReceived: 1 },
        },
      },
    ]);
    count.mockResolvedValue(2);

    const result = await service.listFreelancers({ page: 1, limit: 12 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].username).toBe('ahmed-dev');
    expect(result.data[0]).not.toHaveProperty('email');
    expect(result.data[0]).not.toHaveProperty('phone');
  });

  it('applies skill/workMode filters with pagination take/skip', async () => {
    await service.listFreelancers({
      page: 2,
      limit: 12,
      skill: 'react',
      workMode: WorkMode.REMOTE,
      sort: 'newest',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 12,
        take: 12,
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  });
});
