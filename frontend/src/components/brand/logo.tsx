'use client';

import Image, { type StaticImageData } from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import logoIcon from '@/assets/brand/logo-icon.png';

const LOGO_IMAGE: StaticImageData = logoIcon;

type LogoProps = {
  showName?: boolean;
  className?: string;
  nameClassName?: string;
  iconClassName?: string;
  href?: string;
};

export function Logo({
  showName = true,
  className = '',
  nameClassName = '',
  iconClassName = '',
  href = '/',
}: LogoProps) {
  const t = useTranslations('brand');
  const brandName = t('nameStyled');

  const content = (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <Image
        src={LOGO_IMAGE}
        alt={t('name')}
        width={LOGO_IMAGE.width}
        height={LOGO_IMAGE.height}
        sizes="40px"
        className={`h-10 w-10 shrink-0 object-contain ${iconClassName}`}
        priority
        unoptimized
      />
      {showName ? (
        <span
          className={`text-xl font-bold leading-tight text-primary ${nameClassName}`}
        >
          {brandName}
        </span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}
