import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { evaluateIncompleteFreelancerDeletion } from '../src/admin/admin-incomplete-user-deletion.util.js';

const emptyActivity = {
  proposals: 0,
  projectsAsClient: 0,
  escrowsAsFreelancer: 0,
  escrowsAsClient: 0,
  reviewsGiven: 0,
  reviewsReceived: 0,
  conversationMembers: 0,
  projectAgreementsAsFreelancer: 0,
  projectAgreementsAsClient: 0,
};

describe('evaluateIncompleteFreelancerDeletion', () => {
  it('allows deleting incomplete freelancers with no activity', () => {
    const result = evaluateIncompleteFreelancerDeletion({
      role: Role.FREELANCER,
      profile: {
        profilePhoto: null,
        professionalTitle: null,
        bio: null,
        cityId: null,
        skillCount: 0,
        portfolioCount: 0,
      },
      activity: emptyActivity,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.profileCompletionPercent).toBe(0);
    }
  });

  it('blocks complete freelancers', () => {
    const result = evaluateIncompleteFreelancerDeletion({
      role: Role.FREELANCER,
      profile: {
        profilePhoto: 'https://cdn.example/a.webp',
        professionalTitle: 'Designer',
        bio: 'Hello',
        cityId: 'city-1',
        skillCount: 2,
        portfolioCount: 1,
      },
      activity: emptyActivity,
    });

    expect(result.allowed).toBe(false);
  });

  it('blocks freelancers with marketplace activity', () => {
    const result = evaluateIncompleteFreelancerDeletion({
      role: Role.FREELANCER,
      profile: {
        profilePhoto: null,
        professionalTitle: null,
        bio: null,
        cityId: null,
        skillCount: 0,
        portfolioCount: 0,
      },
      activity: { ...emptyActivity, proposals: 1 },
    });

    expect(result.allowed).toBe(false);
  });

  it('blocks non-freelancer roles', () => {
    const result = evaluateIncompleteFreelancerDeletion({
      role: Role.CLIENT,
      profile: {},
      activity: emptyActivity,
    });

    expect(result.allowed).toBe(false);
  });
});
