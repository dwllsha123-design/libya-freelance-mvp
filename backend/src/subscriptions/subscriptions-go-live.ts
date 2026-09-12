/**
 * Commercial subscription go-live gate.
 *
 * Deploying code or running schema migrations must NOT start the 30-day trial
 * countdown or enable paywall enforcement. Trials and enforcement activate only
 * after an explicit commercial go-live timestamp.
 *
 * Set SUBSCRIPTIONS_GO_LIVE_AT to an ISO-8601 UTC timestamp, e.g.:
 *   SUBSCRIPTIONS_GO_LIVE_AT=2026-10-01T00:00:00.000Z
 *
 * Leave unset (or empty) in production until a real PSP is contracted and the
 * commercial launch is approved. Staging may set a synthetic past timestamp for
 * controlled tests only.
 *
 * READY_FOR_SUBSCRIPTION_PAYWALL remains NO until a real gateway is verified —
 * that is a separate gate from go-live (platform flag SUBSCRIPTIONS + PSP).
 */

export type EnvLike = {
  SUBSCRIPTIONS_GO_LIVE_AT?: string | undefined;
};

export function resolveSubscriptionsGoLiveAt(
  env: EnvLike = process.env,
): Date | null {
  const raw = env.SUBSCRIPTIONS_GO_LIVE_AT?.trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid SUBSCRIPTIONS_GO_LIVE_AT="${raw}". Use an ISO-8601 UTC timestamp.`,
    );
  }
  return parsed;
}

/** True only when go-live is configured AND asOf is at/after that instant. */
export function isSubscriptionsCommercialLive(
  asOf: Date = new Date(),
  env: EnvLike = process.env,
): boolean {
  const goLiveAt = resolveSubscriptionsGoLiveAt(env);
  if (!goLiveAt) return false;
  return asOf.getTime() >= goLiveAt.getTime();
}

/**
 * Resolve the timestamp to use for go-live backfill.
 * Prefers CLI `--go-live-at`, then SUBSCRIPTIONS_GO_LIVE_AT. Never defaults to "now".
 */
export function resolveBackfillGoLiveAt(options: {
  cliGoLiveAt?: string | null;
  env?: EnvLike;
}): Date {
  const env = options.env ?? process.env;
  const raw = options.cliGoLiveAt?.trim() || env.SUBSCRIPTIONS_GO_LIVE_AT?.trim();
  if (!raw) {
    throw new Error(
      'Commercial go-live timestamp required. Pass --go-live-at=<ISO> or set SUBSCRIPTIONS_GO_LIVE_AT. ' +
        'Refusing to default to "now" so deploy/migrate cannot start trial countdowns.',
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid go-live timestamp: ${raw}`);
  }
  return parsed;
}
