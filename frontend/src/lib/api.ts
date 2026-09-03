import type { AppLocale } from '@/i18n/routing';
import arErrors from '../../messages/ar/errors.json';
import enErrors from '../../messages/en/errors.json';

const DEVELOPMENT_API_URL = 'http://localhost:4000/api';
const PRODUCTION_API_URL = 'https://api.libyanfreelance.ly/api';

/**
 * `NEXT_PUBLIC_API_URL` is inlined at build time and should always be supplied
 * by the deployment (Railway service variable / Docker build arg). If it is
 * missing we must not leave a production bundle pointing at localhost, so the
 * fallback follows the build mode instead.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_API_URL
    : DEVELOPMENT_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** API origin without the trailing `/api` (health probes, Socket.IO). */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const CLIENT_REQUEST_HEADER = 'X-Client-Request';
export const CLIENT_REQUEST_VALUE = 'libya-freelance';

export type ErrorMessageKey = keyof typeof arErrors;

const ERROR_MESSAGES: Record<AppLocale, typeof arErrors> = {
  ar: arErrors,
  en: enErrors,
};

export function getApiErrorMessage(
  locale: AppLocale,
  key: ErrorMessageKey = 'unexpected',
): string {
  return ERROR_MESSAGES[locale][key] ?? ERROR_MESSAGES.ar[key];
}

export type UserRole = 'FREELANCER' | 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  profile: {
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface City {
  id: string;
  nameAr: string;
  slug: string;
  isRemote: boolean;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  nameAr: string;
  slug: string;
  description?: string | null;
}

export interface PublicPortfolioItem {
  id: string;
  title: string;
  description: string;
  projectUrl?: string | null;
  completedAt?: string | null;
  skills: Skill[];
  images: { id: string; imageUrl: string; sortOrder: number }[];
  coverImage?: string | null;
}

export interface PublicProfile {
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
  bio?: string | null;
  city?: City | null;
  country: string;
  workMode: string;
  joinDate: string;
  role: UserRole;
  freelancer?: {
    professionalTitle?: string | null;
    availability: string;
    hourlyRate?: number | null;
    completedProjects: number;
    averageRating: number;
    isVerified?: boolean;
    skills: Skill[];
    portfolio?: {
      count: number;
      recentThumbnails: string[];
    };
  } | null;
  client?: {
    displayName?: string | null;
    companySector?: string | null;
    organizationSize?: string | null;
    projectsPosted: number;
    averageRating: number;
  } | null;
  portfolio?: {
    count: number;
    items: PublicPortfolioItem[];
  };
  reviews?: {
    ratingAverage: number;
    reviewCount: number;
    latestReviews: {
      id: string;
      rating: number;
      comment?: string | null;
      createdAt: string;
      reviewer?: {
        username: string;
        displayName: string;
        profilePhoto?: string | null;
      } | null;
      project?: { title: string; slug?: string };
    }[];
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response, locale: AppLocale = 'ar'): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(', ')
          : getApiErrorMessage(locale);

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  locale: AppLocale = 'ar',
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set(CLIENT_REQUEST_HEADER, CLIENT_REQUEST_VALUE);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return parseResponse<T>(response, locale);
}

export async function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
  locale: AppLocale = 'ar',
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return apiRequest<T>(path, {
    ...options,
    headers,
  }, locale);
}
