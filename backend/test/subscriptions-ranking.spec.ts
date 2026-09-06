import { describe, expect, it } from 'vitest';
import {
  clampProBoostScore,
  compareFreelancerRanking,
} from '../src/subscriptions/ranking.util.js';
import { allowSimulatedProActivation } from '../src/subscriptions/subscriptions.constants.js';

describe('ranking util', () => {
  it('ranks quality above Pro boost', () => {
    const highQualityFree = {
      averageRating: 4.9,
      completedProjects: 10,
      proBoostScore: 0,
      createdAtMs: 1,
    };
    const lowQualityPro = {
      averageRating: 3.0,
      completedProjects: 1,
      proBoostScore: 1,
      createdAtMs: 100,
    };
    expect(compareFreelancerRanking(highQualityFree, lowQualityPro)).toBeLessThan(0);
  });

  it('uses Pro boost only as tie-breaker', () => {
    const a = {
      averageRating: 4.5,
      completedProjects: 5,
      proBoostScore: 0,
      createdAtMs: 1,
    };
    const b = {
      averageRating: 4.5,
      completedProjects: 5,
      proBoostScore: 1,
      createdAtMs: 1,
    };
    expect(compareFreelancerRanking(a, b)).toBeGreaterThan(0);
  });

  it('clamps Pro boost to 0 or 1', () => {
    expect(clampProBoostScore(0)).toBe(0);
    expect(clampProBoostScore(1)).toBe(1);
    expect(clampProBoostScore(99)).toBe(1);
    expect(clampProBoostScore(-3)).toBe(0);
  });
});

describe('allowSimulatedProActivation', () => {
  it('allows outside production without flag', () => {
    expect(allowSimulatedProActivation('development', false)).toBe(true);
    expect(allowSimulatedProActivation('test', false)).toBe(true);
  });

  it('blocks production unless flag enabled', () => {
    expect(allowSimulatedProActivation('production', false)).toBe(false);
    expect(allowSimulatedProActivation('production', true)).toBe(true);
  });
});
