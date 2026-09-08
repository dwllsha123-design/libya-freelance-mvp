'use client';

import Image from 'next/image';

function initials(firstName?: string | null, lastName?: string | null, email?: string) {
  const a = (firstName ?? '').trim().charAt(0);
  const b = (lastName ?? '').trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  if (value) return value;
  return (email?.charAt(0) ?? '?').toUpperCase();
}

export function UserAvatarFace({
  photoUrl,
  firstName,
  lastName,
  email,
  size = 'md',
  className = '',
}: {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim =
    size === 'lg' ? 'h-14 w-14 text-base' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm sm:h-11 sm:w-11';

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        width={size === 'lg' ? 56 : 44}
        height={size === 'lg' ? 56 : 44}
        className={`${dim} rounded-full object-cover ring-2 ring-cream ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full bg-ember/15 font-bold text-ember ring-2 ring-cream ${className}`}
      aria-hidden
    >
      {initials(firstName, lastName, email)}
    </span>
  );
}

export function UserAvatarButton({
  open,
  onToggle,
  photoUrl,
  firstName,
  lastName,
  email,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      className="relative grid size-9 place-items-center rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ember/60 sm:size-10 md:size-11"
    >
      <UserAvatarFace
        photoUrl={photoUrl}
        firstName={firstName}
        lastName={lastName}
        email={email}
        size="md"
      />
    </button>
  );
}

export function UserAvatarSkeleton() {
  return (
    <span
      className="inline-block size-9 animate-pulse rounded-full bg-cream-deep sm:size-10 md:size-11"
      aria-hidden
    />
  );
}
