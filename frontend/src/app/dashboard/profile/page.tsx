'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useProfileData } from '@/hooks/use-profile';
import { ProfilePhotoUpload } from '@/components/profile/profile-photo-upload';
import { ApiError } from '@/lib/api';
import { useState } from 'react';

export default function ProfileEditPage() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const {
    profile,
    skills,
    allSkills,
    cities,
    isLoading,
    error,
    setProfilePhoto,
    updateProfile,
    addSkill,
    removeSkill,
  } = useProfileData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (authLoading || isLoading) {
    return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4">يجب تسجيل الدخول</p>
        <Link href="/login" className="text-primary">تسجيل الدخول</Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      await updateProfile({
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        username: String(formData.get('username') ?? ''),
        bio: String(formData.get('bio') ?? ''),
        cityId: String(formData.get('cityId') ?? '') || undefined,
        workMode: String(formData.get('workMode') ?? 'ON_SITE'),
        phone: String(formData.get('phone') ?? ''),
        professionalTitle: String(formData.get('professionalTitle') ?? ''),
        displayName: String(formData.get('displayName') ?? ''),
      });
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">تعديل الملف الشخصي</h1>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {saveError ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {saveSuccess ? (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">تم الحفظ بنجاح</div>
      ) : null}

      {profile && accessToken ? (
        <ProfilePhotoUpload
          currentPhoto={profile.profilePhoto}
          accessToken={accessToken}
          onUploaded={setProfilePhoto}
        />
      ) : null}

      {profile ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">الاسم الأول</label>
              <input name="firstName" defaultValue={profile.firstName} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">اسم العائلة</label>
              <input name="lastName" defaultValue={profile.lastName} className="w-full rounded-lg border px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">اسم المستخدم</label>
            <input name="username" defaultValue={profile.username} className="w-full rounded-lg border px-3 py-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">نبذة</label>
            <textarea name="bio" defaultValue={profile.bio ?? ''} rows={4} className="w-full rounded-lg border px-3 py-2" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">المدينة</label>
              <select name="cityId" defaultValue={profile.city?.id ?? ''} className="w-full rounded-lg border px-3 py-2">
                <option value="">— اختر —</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">نمط العمل</label>
              <select name="workMode" defaultValue={profile.workMode} className="w-full rounded-lg border px-3 py-2">
                <option value="ON_SITE">في الموقع</option>
                <option value="REMOTE">عن بُعد</option>
                <option value="HYBRID">هجين</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">الهاتف (اختياري)</label>
            <input name="phone" className="w-full rounded-lg border px-3 py-2" />
          </div>

          {user.role === 'FREELANCER' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">المسمى المهني</label>
              <input
                name="professionalTitle"
                defaultValue={profile.freelancer?.professionalTitle ?? ''}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : null}

          {user.role === 'CLIENT' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">اسم العرض (اختياري)</label>
              <input
                name="displayName"
                defaultValue={profile.client?.displayName ?? ''}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>
      ) : null}

      {user.role === 'FREELANCER' ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold">المهارات</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => removeSkill(skill.id)}
                className="rounded-full bg-on-surface px-3 py-1 text-sm text-white"
              >
                {skill.name} ×
              </button>
            ))}
          </div>
          {skills.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">لم تُضف مهارات بعد</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {allSkills
              .filter((s) => !skills.some((ms) => ms.id === s.id))
              .map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => addSkill(skill.id)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm"
                >
                  + {skill.name}
                </button>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
