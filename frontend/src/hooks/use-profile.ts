'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  ApiError,
  authenticatedRequest,
  apiRequest,
  type Category,
  type City,
  type PublicProfile,
  type Skill,
} from '@/lib/api';

export function useProfileData() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [profileRes, mySkills, skillsRes, citiesRes] = await Promise.all([
        authenticatedRequest<PublicProfile>('/profiles/me', accessToken),
        authenticatedRequest<Skill[]>('/profiles/me/skills', accessToken).catch(
          () => [],
        ),
        apiRequest<Skill[]>('/skills'),
        apiRequest<City[]>('/cities'),
      ]);

      setProfile(profileRes);
      setSkills(mySkills);
      setAllSkills(skillsRes);
      setCities(citiesRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل تحميل الملف الشخصي');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!accessToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const [profileRes, mySkills, skillsRes, citiesRes] = await Promise.all([
          authenticatedRequest<PublicProfile>('/profiles/me', accessToken),
          authenticatedRequest<Skill[]>('/profiles/me/skills', accessToken).catch(
            () => [],
          ),
          apiRequest<Skill[]>('/skills'),
          apiRequest<City[]>('/cities'),
        ]);

        if (!cancelled) {
          setProfile(profileRes);
          setSkills(mySkills);
          setAllSkills(skillsRes);
          setCities(citiesRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'فشل تحميل الملف الشخصي',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const setProfilePhoto = (photoUrl: string) => {
    setProfile((prev) => (prev ? { ...prev, profilePhoto: photoUrl } : prev));
  };

  const updateProfile = async (payload: Record<string, unknown>) => {
    if (!accessToken) return;

    const updated = await authenticatedRequest<PublicProfile>(
      '/profiles/me',
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );

    setProfile(updated);
    return updated;
  };

  const addSkill = async (skillId: string) => {
    if (!accessToken) return;

    const updated = await authenticatedRequest<Skill[]>(
      '/profiles/me/skills',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ skillId }),
      },
    );

    setSkills(updated);
  };

  const removeSkill = async (skillId: string) => {
    if (!accessToken) return;

    const updated = await authenticatedRequest<Skill[]>(
      `/profiles/me/skills/${skillId}`,
      accessToken,
      { method: 'DELETE' },
    );

    setSkills(updated);
  };

  return {
    profile,
    skills,
    allSkills,
    cities,
    categories,
    isLoading,
    error,
    reload,
    setProfilePhoto,
    updateProfile,
    addSkill,
    removeSkill,
    loadCategories: async () => {
      const data = await apiRequest<Category[]>('/categories');
      setCategories(data);
    },
  };
}
