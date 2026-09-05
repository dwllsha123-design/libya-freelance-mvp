'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { DESIGN_LOGO_MARK_PATH, LOGO_ICON_PATH } from '@/lib/branding';

const LOGO_ICON_SIZE = 40;

type LogoProps = {
  showName?: boolean;
  /** Plain short name (fits mobile nav). Styled keeps kashida for hero/footer. */
  compact?: boolean;
  className?: string;
  nameClassName?: string;
  iconClassName?: string;
  href?: string;
  /** Use Figma design circular mark when available */
  variant?: 'default' | 'mark';
};

function BrandName({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations('brand');
  const locale = useLocale();
  const label = compact ? t('name') : t('nameStyled');

  if (locale === 'ar') {
    const parts = label.split(/\s+/);
    const first = parts[0] ?? label;
    const rest = parts.slice(1).join(' ');
    return (
      <span
        className={`font-display max-w-full truncate text-[1.05rem] font-bold leading-none tracking-tight ${className}`}
      >
        <span className="text-ink">{first}</span>
        {rest ? <span className="text-ember"> {rest}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={`font-display max-w-full truncate text-[1.05rem] font-bold leading-none tracking-tight text-ink ${className}`}
    >
      {label}
    </span>
  );
}

export function Logo({
  showName = true,
  compact = false,
  className = '',
  nameClassName = '',
  iconClassName = '',
  href = '/',
  variant = 'mark',
}: LogoProps) {
  const t = useTranslations('brand');
  const src = variant === 'mark' ? DESIGN_LOGO_MARK_PATH : LOGO_ICON_PATH;

  const content = (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
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
      {showName ? <BrandName compact={compact} className={nameClassName} /> : null}
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
