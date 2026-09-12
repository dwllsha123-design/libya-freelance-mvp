import { describe, expect, it } from 'vitest';
import { CommissionSource } from '@prisma/client';
import { CommissionResolutionService } from '../src/commercial/commission-resolution.service.js';

describe('CommissionResolutionService advertising freeze', () => {
  const service = new CommissionResolutionService(
    {} as never,
    {} as never,
  );

  it('resolveForProject always returns 0% commission', async () => {
    const resolved = await service.resolveForProject('any-project', 1000);
    expect(resolved.commissionPercent).toBe(0);
    expect(resolved.platformFee).toBe(0);
    expect(resolved.freelancerPayout).toBe(1000);
    expect(resolved.source).toBe(CommissionSource.PLATFORM_DEFAULT);
  });

  it('preview always reports projectCommission 0', async () => {
    const preview = await service.preview({ projectValue: 1000, commissionPercent: 12 });
    expect(preview.projectCommission).toBe(0);
    expect(preview.commissionPercent).toBe(0);
    expect(preview.advertisingModel).toBe(true);
  });

  it('createInvestorAccrualsInTx is a no-op', async () => {
    const created = await service.createInvestorAccrualsInTx(
      {} as never,
      'escrow-1',
      120,
      'LYD',
    );
    expect(created).toEqual([]);
  });
});
