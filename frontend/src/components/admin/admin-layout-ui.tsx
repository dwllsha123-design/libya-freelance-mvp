'use client';

import type { ReactNode } from 'react';

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-1 text-xs text-slate-500">{breadcrumb}</div> : null}
        <h1 className="text-2xl font-bold text-on-surface md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block transition hover:border-primary/40">
        {body}
      </a>
    );
  }
  return body;
}

export function AdminPanel({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Simple real-data bar chart (no chart library). Empty when all zeros. */
export function AdminBarChart({
  labels,
  values,
  emptyLabel,
  formatValue,
}: {
  labels: string[];
  values: number[];
  emptyLabel: string;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(...values, 0);
  if (!values.length || max <= 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex h-44 items-end gap-2">
      {values.map((value, index) => {
        const height = Math.max(4, Math.round((value / max) * 100));
        return (
          <div key={labels[index] ?? index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] text-slate-500">
              {formatValue ? formatValue(value) : value}
            </span>
            <div
              className="w-full max-w-8 rounded-t-md bg-primary/85"
              style={{ height: `${height}%` }}
              title={`${labels[index]}: ${value}`}
            />
            <span className="truncate text-[10px] text-slate-400">{labels[index]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminAlertBanner({
  tone = 'warning',
  children,
  href,
}: {
  tone?: 'warning' | 'danger' | 'info';
  children: ReactNode;
  href?: string;
}) {
  const tones = {
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    danger: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-sky-200 bg-sky-50 text-sky-950',
  };
  const className = `block rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`;
  if (href) {
    return (
      <a href={href} className={`${className} hover:opacity-90`}>
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

export function AdminComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
