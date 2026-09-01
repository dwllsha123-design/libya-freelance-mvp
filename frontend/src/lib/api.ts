export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const CLIENT_REQUEST_HEADER = 'X-Client-Request';
export const CLIENT_REQUEST_VALUE = 'libya-freelance';

export type UserRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';
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

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(', ')
          : 'حدث خطأ غير متوقع';

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
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

  return parseResponse<T>(response);
}

export async function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return apiRequest<T>(path, {
    ...options,
    headers,
  });
}
