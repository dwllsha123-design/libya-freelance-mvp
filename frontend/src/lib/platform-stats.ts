import { apiRequest } from '@/lib/api';

export interface PlatformStats {
  users: number;
  freelancers: number;
  clients: number;
  projects: number;
  completedProjects: number;
  reviews: number;
  averageRating: number;
  satisfactionPercent: number | null;
  verifiedFreelancers: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    return await apiRequest<PlatformStats>('/platform/stats');
  } catch {
    return null;
  }
}

export function formatStatValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `${value}`;
}
