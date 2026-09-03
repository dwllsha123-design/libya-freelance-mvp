'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { DESIGN_LOGO_MARK_PATH, LOGO_ICON_PATH } from '@/lib/branding';

const LOGO_ICON_SIZE = 40;

type LogoProps = {
  showName?: boolean;
  className?: string;
  nameClassName?: string;
  iconClassName?: string;
  href?: string;
  /** Use Figma design circular mark when available */
  variant?: 'default' | 'mark';
};

function BrandName({ className = '' }: { className?: string }) {
  const t = useTranslations('brand');
  const locale = useLocale();
  const styled = t('nameStyled');

  if (locale === 'ar') {
    const parts = styled.split(/\s+/);
    const first = parts[0] ?? styled;
    const rest = parts.slice(1).join(' ');
    return (
      <span
        className={`font-display text-[1.05rem] font-bold leading-none tracking-tight ${className}`}
      >
        <span className="text-ink">{first}</span>
        {rest ? <span className="text-ember"> {rest}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={`font-display text-[1.05rem] font-bold leading-none tracking-tight text-ink ${className}`}
    >
      {styled}
    </span>
  );
}

export function Logo({
  showName = true,
  className = '',
  nameClassName = '',
  iconClassName = '',
  href = '/',
  variant = 'mark',
}: LogoProps) {
  const t = useTranslations('brand');
  const src = variant === 'mark' ? DESIGN_LOGO_MARK_PATH : LOGO_ICON_PATH;

  const content = (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-2.5 ${className}`}>
      <Image
        src={src}
        alt={t('name')}
        width={LOGO_ICON_SIZE}
        height={LOGO_ICON_SIZE}
        sizes="40px"
        className={`size-10 shrink-0 rounded-full object-cover ring-1 ring-line shadow-[0_4px_12px_-4px_rgba(29,24,17,0.25)] ${iconClassName}`}
        priority
        unoptimized
      />
      {showName ? <BrandName className={`min-w-0 truncate ${nameClassName}`} /> : null}
    </span>
  );

  if (href) {
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      return (
        <a href={href} className="min-w-0">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className="min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}
