import { Link } from '@/i18n/navigation';

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <span aria-hidden>→</span>
      <span>{children}</span>
    </Link>
  );
}
