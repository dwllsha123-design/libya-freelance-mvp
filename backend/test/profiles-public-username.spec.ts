import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfilesService } from '../src/profiles/profiles.service.js';

function buildService(prisma: unknown) {
  return new ProfilesService(
    prisma as never,
    { uploadProfileImage: vi.fn(), deleteFile: vi.fn() } as never,
    { listForFreelancerUsername: vi.fn().mockResolvedValue({ items: [] }) } as never,
    { getRatingSummary: vi.fn().mockResolvedValue({ averageRating: 0, reviewCount: 0 }) } as never,
    { checkProfileComplete: vi.fn().mockResolvedValue(undefined) } as never,
    { recordProfileView: vi.fn().mockResolvedValue(undefined) } as never,
    {
      getPresenceBatch: vi.fn().mockResolvedValue([]),
      getOnlineUserIds: vi.fn().mockResolvedValue([]),
    } as never,
    { resolveProjectWorkMode: vi.fn() } as never,
  );
}

const publicProfileRow = {
  id: 'profile-1',
  userId: 'user-1',
  username: 'hussin-altoomy',
  firstName: 'Hussin',
  lastName: 'Altoomy',
  profilePhoto: null,
  bio: 'Public bio',
  phone: '0910000000',
  city: null,
  country: 'Libya',
  workMode: 'REMOTE',
  freelancerProfile: {
    professionalTitle: 'Developer',
    availability: 'AVAILABLE',
    hourlyRate: null,
    completedProjects: 2,
    averageRating: 4.5,
    skills: [],
    performanceLevel: 'NONE',
    isVerifiedTalent: false,
    isFoundingFreelancer: false,
  },
  clientProfile: null,
  user: {
    id: 'user-1',
    email: 'secret@example.com',
    role: 'FREELANCER',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    lastSeenAt: null,
    presenceVisibility: 'EVERYONE',
    identityVerification: null,
    freelancerSubscriptions: [],
  },
};

describe('ProfilesService public username', () => {
  const findFirst = vi.fn();
  const findUnique = vi.fn();
  const profileUpdate = vi.fn();
  let service: ProfilesService;

  beforeEach(() => {
    findFirst.mockReset();
    findUnique.mockReset();
    profileUpdate.mockReset();
    service = buildService({
      profile: {
        findFirst,
        findUnique,
        update: profileUpdate,
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          profile: {
            update: profileUpdate,
            findUnique: vi.fn().mockResolvedValue(publicProfileRow),
          },
          freelancerProfile: { update: vi.fn() },
          clientProfile: { update: vi.fn() },
          user: { update: vi.fn() },
        }),
      ),
      city: { findFirst: vi.fn() },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    });
  });

  it('returns 404 for nonexistent username', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.getFreelancerByUsername('nobody-here')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 for reserved / malformed usernames', async () => {
    await expect(service.getFreelancerByUsername('admin')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getFreelancerByUsername('../etc')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('loads the correct public profile without private fields', async () => {
    findFirst.mockResolvedValue(publicProfileRow);

    const result = await service.getFreelancerByUsername('Hussin-Altoomy');
    expect(result.username).toBe('hussin-altoomy');
    expect(result.firstName).toBe('Hussin');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
  });

  it('changing display name does not change permalink username', async () => {
    findUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      username: 'hussin-altoomy',
      firstName: 'Hussin',
      lastName: 'Altoomy',
      country: 'Libya',
      user: { role: 'FREELANCER' },
      freelancerProfile: { id: 'fp-1' },
      clientProfile: null,
    });

    const updated = await service.updateMyProfile('user-1', {
      firstName: 'Hussein',
      lastName: 'Altoomy',
    });

    expect(profileUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: expect.not.objectContaining({ username: expect.anything() }),
    });
    expect(updated.username).toBe('hussin-altoomy');
  });

  it('rejects duplicate username updates', async () => {
    findUnique
      .mockResolvedValueOnce({
        id: 'profile-1',
        userId: 'user-1',
        username: 'hussin-altoomy',
        firstName: 'Hussin',
        lastName: 'Altoomy',
        country: 'Libya',
        user: { role: 'FREELANCER' },
        freelancerProfile: { id: 'fp-1' },
        clientProfile: null,
      })
      .mockResolvedValueOnce({ id: 'other' });

    await expect(
      service.updateMyProfile('user-1', { username: 'mohamed-ali' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
