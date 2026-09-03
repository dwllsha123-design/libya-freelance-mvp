'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

function FlagLibya({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 24"
      width={20}
      height={14}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="8" y="0" fill="#E70013" />
      <rect width="36" height="8" y="8" fill="#000000" />
      <rect width="36" height="8" y="16" fill="#239E46" />
      <circle cx="16.2" cy="12" r="3.2" fill="#ffffff" />
      <circle cx="17.35" cy="12" r="2.55" fill="#000000" />
      <polygon
        fill="#ffffff"
        points="20.4,12 21.55,12.35 21.2,11.2 22.35,10.5 21.1,10.45 20.4,9.35 19.7,10.45 18.45,10.5 19.6,11.2 19.25,12.35"
      />
    </svg>
  );
}

function FlagUk({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 24"
      width={20}
      height={14}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="24" fill="#012169" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#ffffff" strokeWidth="5" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#C8102E" strokeWidth="2.2" />
      <path d="M18,0 V24 M0,12 H36" stroke="#ffffff" strokeWidth="8" />
      <path d="M18,0 V24 M0,12 H36" stroke="#C8102E" strokeWidth="4.5" />
    </svg>
  );
}

const LOCALES: {
  code: AppLocale;
  label: string;
  Flag: (props: { className?: string }) => React.ReactElement;
}[] = [
  { code: 'ar', label: 'العربية', Flag: FlagLibya },
  { code: 'en', label: 'English', Flag: FlagUk },
];

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="flex shrink-0 items-center rounded-full border border-line bg-cream p-0.5"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((item) => {
        const active = locale === item.code;
        const Flag = item.Flag;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => switchLocale(item.code)}
            className={`grid size-8 shrink-0 place-items-center rounded-full transition ${
              active
                ? 'bg-ink/5 ring-1 ring-ember/50'
                : 'hover:bg-cream-deep'
            }`}
            aria-pressed={active}
            aria-label={item.label}
            title={item.label}
          >
            <Flag className="block h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10" />
          </button>
        );
      })}
    </div>
  );
}
