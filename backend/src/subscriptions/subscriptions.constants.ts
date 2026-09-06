export const FREE_PORTFOLIO_ITEM_LIMIT = 8;
export const PRO_PLAN_CODE = 'FREELANCER_PRO';
export const IDENTITY_VERIFICATION_VALIDITY_DAYS = 730; // ~2 years
export const VERIFICATION_DOC_MAX_SIZE = 5 * 1024 * 1024;
export const VERIFICATION_DOC_MAX_COUNT = 3;
export const VERIFICATION_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/** Env/feature gate: simulated payments may activate Pro only when explicitly allowed. */
export function allowSimulatedProActivation(
  nodeEnv: string | undefined,
  flagEnabled: boolean,
): boolean {
  if (flagEnabled) return true;
  return nodeEnv !== 'production';
}
