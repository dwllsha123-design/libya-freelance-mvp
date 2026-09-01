import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { WorkMode } from '@prisma/client';
import {
  ProjectStateService,
  validateProjectForPublish,
} from '../src/projects/project-validation.util.js';

describe('project validation', () => {
  it('rejects invalid budget range', () => {
    expect(() =>
      validateProjectForPublish({
        title: 'A valid project title here',
        description: 'A'.repeat(50),
        categoryId: 'cat',
        skillIds: ['s1'],
        budgetMin: 5000,
        budgetMax: 1000,
        workMode: WorkMode.REMOTE,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects past deadline', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);

    expect(() =>
      validateProjectForPublish({
        title: 'A valid project title here',
        description: 'A'.repeat(50),
        categoryId: 'cat',
        skillIds: ['s1'],
        budgetMin: 100,
        budgetMax: 500,
        deadline: past,
        workMode: WorkMode.REMOTE,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects remote project with city', () => {
    expect(() =>
      validateProjectForPublish({
        title: 'A valid project title here',
        description: 'A'.repeat(50),
        categoryId: 'cat',
        skillIds: ['s1'],
        budgetMin: 100,
        budgetMax: 500,
        workMode: WorkMode.REMOTE,
        cityId: 'city-1',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('project state', () => {
  it('allows publish only from draft', () => {
    expect(() => ProjectStateService.assertCanPublish('OPEN' as never)).toThrow();
    expect(() => ProjectStateService.assertCanPublish('DRAFT' as never)).not.toThrow();
  });

  it('allows delete only draft', () => {
    expect(() => ProjectStateService.assertCanDelete('OPEN' as never)).toThrow();
    expect(() => ProjectStateService.assertCanDelete('DRAFT' as never)).not.toThrow();
  });
});
