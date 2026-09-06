'use client';

/** Identity KYC badge — independent from trust VerifiedBadge and Pro. */
export function IdentityVerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-emerald-600/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 ${className}`}
      title="الهوية موثقة"
    >
      ✓ الهوية موثقة
    </span>
  );
}

export function ProBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 dark:text-amber-200 ${className}`}
      title="Libya Freelance Pro"
    >
      PRO
    </span>
  );
}
