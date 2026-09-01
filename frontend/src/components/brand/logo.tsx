import Image from 'next/image';
import Link from 'next/link';
import { LOGO_ICON_PATH, PLATFORM_NAME_AR, PLATFORM_NAME_AR_STYLED } from '@/lib/branding';

type LogoProps = {
  showName?: boolean;
  className?: string;
  nameClassName?: string;
  href?: string;
};

export function Logo({
  showName = true,
  className = '',
  nameClassName = '',
  href = '/',
}: LogoProps) {
  const content = (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <Image
        src={LOGO_ICON_PATH}
        alt={PLATFORM_NAME_AR}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        priority
      />
      {showName ? (
        <span
          className={`text-xl font-bold leading-tight text-primary ${nameClassName}`}
        >
          {PLATFORM_NAME_AR_STYLED}
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
