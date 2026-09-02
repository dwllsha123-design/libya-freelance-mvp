/** Mobile store / release status — safe public values only */
export const APP_STORE_STATUSES = [
  'COMING_SOON',
  'BETA',
  'AVAILABLE',
  'MAINTENANCE',
] as const;

export type AppStoreStatus = (typeof APP_STORE_STATUSES)[number];

export const DEFAULT_APP_STORE_STATUS: AppStoreStatus = 'COMING_SOON';

export function isAppStoreStatus(value: unknown): value is AppStoreStatus {
  return (
    typeof value === 'string' &&
    (APP_STORE_STATUSES as readonly string[]).includes(value)
  );
}

/** Allow only https URLs for store / legal links (empty string = unset) */
export function assertSafeHttpsUrl(
  value: unknown,
  field: string,
): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${field} is not a valid URL`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`${field} must use https`);
  }
  return trimmed;
}
