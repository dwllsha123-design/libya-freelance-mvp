import { describe, expect, it } from 'vitest';
import {
  isSubscriptionsCommercialLive,
  resolveBackfillGoLiveAt,
  resolveSubscriptionsGoLiveAt,
} from '../src/subscriptions/subscriptions-go-live.js';

describe('subscriptions go-live gate', () => {
  it('treats unset go-live as not commercially live', () => {
    expect(resolveSubscriptionsGoLiveAt({})).toBeNull();
    expect(isSubscriptionsCommercialLive(new Date(), {})).toBe(false);
  });

  it('becomes live only at/after the configured timestamp', () => {
    const env = { SUBSCRIPTIONS_GO_LIVE_AT: '2026-10-01T00:00:00.000Z' };
    expect(isSubscriptionsCommercialLive(new Date('2026-09-30T23:59:59.000Z'), env)).toBe(
      false,
    );
    expect(isSubscriptionsCommercialLive(new Date('2026-10-01T00:00:00.000Z'), env)).toBe(
      true,
    );
  });

  it('refuses backfill without an explicit go-live timestamp', () => {
    expect(() => resolveBackfillGoLiveAt({ env: {} })).toThrow(/go-live timestamp required/i);
  });

  it('accepts CLI go-live over env for backfill', () => {
    const d = resolveBackfillGoLiveAt({
      cliGoLiveAt: '2026-11-01T00:00:00.000Z',
      env: { SUBSCRIPTIONS_GO_LIVE_AT: '2026-10-01T00:00:00.000Z' },
    });
    expect(d.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});
