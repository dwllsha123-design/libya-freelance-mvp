import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ProjectStatus, ProposalStatus, Role } from '@prisma/client';
import {
  assertClientCanComplete,
  assertFreelancerCanRequestCompletion,
  deriveReviewTarget,
  validateRating,
  validateReviewComment,
} from '../src/reviews/review-validation.util.js';
import { ProjectStateService } from '../src/projects/project-validation.util.js';

const inProgressCtx = {
  status: ProjectStatus.IN_PROGRESS,
  clientId: 'client-1',
  acceptedProposalId: 'proposal-1',
  acceptedProposal: {
    id: 'proposal-1',
    status: ProposalStatus.ACCEPTED,
    freelancerId: 'freelancer-1',
  },
};

describe('completion eligibility', () => {
  it('allows accepted freelancer to request completion', () => {
    expect(() =>
      assertFreelancerCanRequestCompletion('freelancer-1', inProgressCtx),
    ).not.toThrow();
  });

  it('blocks unrelated freelancer', () => {
    expect(() =>
      assertFreelancerCanRequestCompletion('other', inProgressCtx),
    ).toThrow(BadRequestException);
  });

  it('allows client to complete in progress project', () => {
    expect(() =>
      assertClientCanComplete('client-1', inProgressCtx),
    ).not.toThrow();
  });
});

describe('review eligibility', () => {
  it('derives freelancer target for client reviewer', () => {
    expect(
      deriveReviewTarget('client-1', Role.CLIENT, {
        ...inProgressCtx,
        status: ProjectStatus.COMPLETED,
      }),
    ).toBe('freelancer-1');
  });

  it('derives client target for freelancer reviewer', () => {
    expect(
      deriveReviewTarget('freelancer-1', Role.FREELANCER, {
        ...inProgressCtx,
        status: ProjectStatus.COMPLETED,
      }),
    ).toBe('client-1');
  });

  it('rejects review before completion', () => {
    expect(() =>
      deriveReviewTarget('client-1', Role.CLIENT, inProgressCtx),
    ).toThrow(BadRequestException);
  });
});

describe('rating validation', () => {
  it('accepts 1-5', () => {
    expect(validateRating(5)).toBe(5);
  });

  it('rejects out of range', () => {
    expect(() => validateRating(0)).toThrow();
    expect(() => validateRating(6)).toThrow();
  });

  it('validates optional comment length', () => {
    expect(validateReviewComment(null)).toBeNull();
    expect(() => validateReviewComment('short')).toThrow();
  });
});

describe('project state transitions', () => {
  it('transitions in progress to completed', () => {
    const result = ProjectStateService.transitionToCompleted();
    expect(result.status).toBe(ProjectStatus.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
  });
});
