import Link from 'next/link';
import type { ReactNode } from 'react';

export function MarketingPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-on-surface">{title}</h1>
      {subtitle ? <p className="mt-2 text-on-surface-variant">{subtitle}</p> : null}
      <div className="prose prose-slate mt-8 max-w-none space-y-4 text-on-surface [&_a]:text-primary [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:text-on-surface-variant [&_p]:leading-relaxed [&_p]:text-on-surface-variant">
        {children}
      </div>
      <p className="mt-10">
        <Link href="/" className="text-primary hover:underline">
          ← العودة للرئيسية
        </Link>
      </p>
    </div>
  );
}
