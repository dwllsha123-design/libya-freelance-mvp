import Link from 'next/link';
import { PLATFORM_NAME_AR, PLATFORM_TAGLINE_AR } from '@/lib/branding';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <Link href="/" className="text-lg font-bold text-[#0B132B]">
          {PLATFORM_NAME_AR}
        </Link>
        <p className="mt-1 text-xs text-slate-500">{PLATFORM_TAGLINE_AR}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#0B132B]">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      </div>
      {children}
      {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
    </div>
  );
}
