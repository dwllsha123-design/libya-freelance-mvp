import type { ReactNode } from 'react';

export type PageShellVariant = 'content' | 'app' | 'full';

const VARIANT_CLASS: Record<PageShellVariant, string> = {
  /** Text / profile / detail pages */
  content: 'page-shell page-shell--content',
  /** Marketplace / dashboard lists */
  app: 'page-shell page-shell--app',
  /** Tables / admin / data-heavy */
  full: 'page-shell page-shell--full',
};

type PageShellProps = {
  children: ReactNode;
  variant?: PageShellVariant;
  className?: string;
  /** Extra vertical padding */
  padded?: boolean;
};

/**
 * Shared page width + gutter. Prefer this over ad-hoc max-w-* + px-4.
 */
export function PageShell({
  children,
  variant = 'app',
  className = '',
  padded = true,
}: PageShellProps) {
  return (
    <div
      className={`page-gutter ${VARIANT_CLASS[variant]} ${padded ? 'page-shell--padded' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
