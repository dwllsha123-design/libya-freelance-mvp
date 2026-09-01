import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ProposalStatus } from '@prisma/client';
import {
  ProposalStateService,
  validateProposalInput,
} from '../src/proposals/proposal-validation.util.js';

describe('proposal validation', () => {
  it('rejects short cover letter', () => {
    expect(() =>
      validateProposalInput({
        coverLetter: 'قصير',
        proposedPrice: 100,
        estimatedDurationDays: 7,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-positive price', () => {
    expect(() =>
      validateProposalInput({
        coverLetter: 'A'.repeat(50),
        proposedPrice: 0,
        estimatedDurationDays: 7,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid duration', () => {
    expect(() =>
      validateProposalInput({
        coverLetter: 'A'.repeat(50),
        proposedPrice: 100,
        estimatedDurationDays: 400,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('proposal state', () => {
  it('allows withdraw only for PENDING', () => {
    expect(() =>
      ProposalStateService.assertCanWithdraw(ProposalStatus.ACCEPTED),
    ).toThrow(BadRequestException);
  });

  it('allows reject only for PENDING', () => {
    expect(() =>
      ProposalStateService.assertCanReject(ProposalStatus.REJECTED),
    ).toThrow(BadRequestException);
  });
});
