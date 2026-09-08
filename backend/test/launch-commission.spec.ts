import { calculateFeesFromPercent } from '../src/commercial/commercial.constants.js';
import { LAUNCH_PROGRAM_DEFAULTS } from '../src/launch/launch.config.js';

describe('Launch commission policy', () => {
  it('keeps 100% freelancer payout at 0% commission', () => {
    const fees = calculateFeesFromPercent(1000, LAUNCH_PROGRAM_DEFAULTS.freelancerCommissionPercent);
    expect(fees.commissionPercent).toBe(0);
    expect(fees.platformFee).toBe(0);
    expect(fees.freelancerPayout).toBe(1000);
  });

  it('supports future non-zero commission via same calculator', () => {
    const fees = calculateFeesFromPercent(1000, 10);
    expect(fees.platformFee).toBe(100);
    expect(fees.freelancerPayout).toBe(900);
  });
});

describe('Proposal point cost', () => {
  it('charges exactly 10 points for a proposal submit', async () => {
    const { NUQATI_CONFIG } = await import('../src/nuqati/nuqati.config.js');
    expect(NUQATI_CONFIG.proposalSubmitCost).toBe(10);
  });
});
