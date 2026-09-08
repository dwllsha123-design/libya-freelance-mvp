import {
  calculateProfileCompletion,
  meetsProfileCompletionThreshold,
} from '../src/profiles/profile-completion.util.js';
import { LAUNCH_PROGRAM_DEFAULTS } from '../src/launch/launch.config.js';
import { NUQATI_CONFIG } from '../src/nuqati/nuqati.config.js';
import { FALLBACK_COMMISSION_PERCENT } from '../src/commercial/commercial.constants.js';

describe('Launch Program configuration', () => {
  it('uses launch defaults for welcome, profile reward, founding limit, 0% commission', () => {
    expect(LAUNCH_PROGRAM_DEFAULTS.enabled).toBe(true);
    expect(LAUNCH_PROGRAM_DEFAULTS.welcomePoints).toBe(55);
    expect(LAUNCH_PROGRAM_DEFAULTS.profileCompletionReward).toBe(5);
    expect(LAUNCH_PROGRAM_DEFAULTS.profileCompletionThreshold).toBe(80);
    expect(LAUNCH_PROGRAM_DEFAULTS.foundingFreelancerLimit).toBe(1000);
    expect(LAUNCH_PROGRAM_DEFAULTS.freelancerCommissionPercent).toBe(0);
    expect(FALLBACK_COMMISSION_PERCENT).toBe(0);
    expect(NUQATI_CONFIG.proposalSubmitCost).toBe(10);
    expect(NUQATI_CONFIG.welcomeBonus).toBe(55);
    expect(NUQATI_CONFIG.profileCompleteReward).toBe(5);
  });
});

describe('profile completion utility', () => {
  it('returns 0 when empty', () => {
    const result = calculateProfileCompletion({});
    expect(result.percent).toBe(0);
    expect(result.totalFields).toBe(6);
  });

  it('does not meet threshold below 80%', () => {
    // 4/6 ≈ 67%
    const result = calculateProfileCompletion({
      profilePhoto: 'https://x/y.jpg',
      professionalTitle: 'Dev',
      bio: 'Hello',
      cityId: 'city-1',
    });
    expect(result.percent).toBe(67);
    expect(meetsProfileCompletionThreshold(result.percent, 80)).toBe(false);
  });

  it('meets 80% when five of six fields are set', () => {
    const result = calculateProfileCompletion({
      profilePhoto: 'https://x/y.jpg',
      professionalTitle: 'Dev',
      bio: 'Hello world',
      cityId: 'city-1',
      skillCount: 2,
    });
    expect(result.percent).toBe(83);
    expect(meetsProfileCompletionThreshold(result.percent, 80)).toBe(true);
  });

  it('is 100% when all fields are complete', () => {
    const result = calculateProfileCompletion({
      profilePhoto: 'https://x/y.jpg',
      professionalTitle: 'Dev',
      bio: 'Hello world',
      cityId: 'city-1',
      skillCount: 1,
      portfolioCount: 1,
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });
});
