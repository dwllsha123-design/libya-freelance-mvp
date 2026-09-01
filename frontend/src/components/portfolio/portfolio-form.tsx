'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Skill } from '@/lib/api';
import { apiRequest } from '@/lib/api';
import type { PortfolioItem } from '@/hooks/use-portfolio';

interface PortfolioFormProps {
  initial?: PortfolioItem | null;
  isSubmitting: boolean;
  onSubmit: (payload: {
    title: string;
    description: string;
    projectUrl?: string;
    skillIds: string[];
    completedAt?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PortfolioForm({
  initial,
  isSubmitting,
  onSubmit,
  onCancel,
}: PortfolioFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? '');
  const [completedAt, setCompletedAt] = useState(
    initial?.completedAt ? initial.completedAt.slice(0, 10) : '',
  );
  const [skillIds, setSkillIds] = useState<string[]>(
    initial?.skills.map((s) => s.id) ?? [],
  );
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<Skill[]>('/skills').then(setSkills);
  }, []);

  function toggleSkill(id: string) {
    setSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || skillIds.length === 0) {
      setError('يرجى تعبئة الحقول المطلوبة واختيار مهارة واحدة على الأقل');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        projectUrl: projectUrl.trim() || undefined,
        skillIds,
        completedAt: completedAt || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div>
        <label className="mb-1 block text-sm font-medium">عنوان العمل</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          maxLength={120}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">وصف العمل</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
          maxLength={5000}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">المهارات المستخدمة</label>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => {
            const selected = skillIds.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  selected
                    ? 'bg-[#00A86B] text-white'
                    : 'border bg-white text-slate-700'
                }`}
              >
                {skill.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">رابط المشروع — اختياري</label>
        <input
          value={projectUrl}
          onChange={(e) => setProjectUrl(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="https://"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">تاريخ الإنجاز — اختياري</label>
        <input
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {initial?.images?.length ? (
        <div>
          <p className="mb-2 text-sm font-medium">الصور الحالية</p>
          <div className="flex flex-wrap gap-2">
            {initial.images.map((image) => (
              <Image
                key={image.id}
                src={image.imageUrl}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
