'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { API_BASE_URL, ApiError } from '@/lib/api';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024;

interface ProfilePhotoUploadProps {
  currentPhoto?: string | null;
  accessToken: string;
  onUploaded: (photoUrl: string) => void;
}

export function ProfilePhotoUpload({
  currentPhoto,
  accessToken,
  onUploaded,
}: ProfilePhotoUploadProps) {
  const t = useTranslations('profile');
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('invalidFileType');
    }
    if (file.size > MAX_SIZE) {
      return t('fileTooLarge');
    }
    return null;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setValidationError(null);

    const validation = validateFile(file);
    if (validation) {
      setValidationError(validation);
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(40);

      const response = await fetch(
        `${API_BASE_URL}/profiles/me/photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Client-Request': 'libya-freelance',
          },
          body: formData,
          credentials: 'include',
        },
      );

      setUploadProgress(80);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data.message === 'string'
            ? data.message
            : t('uploadFailed');
        throw new ApiError(message, response.status, data);
      }

      const photoUrl = (data.profilePhoto ?? data.profile?.profilePhoto) as string | undefined;
      if (photoUrl) {
        setUploadProgress(100);
        setPreview(photoUrl);
        onUploaded(photoUrl);
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setPreview(currentPhoto ?? null);
      setError(err instanceof ApiError ? err.message : t('uploadFailed'));
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-on-surface">{t('photo')}</h2>

      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
          {preview ? (
            <Image
              src={preview}
              alt={t('photoAlt')}
              fill
              className="object-cover"
              unoptimized={preview.startsWith('blob:')}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">
              ?
            </div>
          )}
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
              {uploadProgress}%
            </div>
          ) : null}
        </div>

        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
          >
            {isUploading ? t('uploading') : t('uploadPhoto')}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            {t('photoHint')}
          </p>
        </div>
      </div>

      {isUploading ? (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      ) : null}

      {validationError ? (
        <p className="mt-3 text-sm text-amber-700">{validationError}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
