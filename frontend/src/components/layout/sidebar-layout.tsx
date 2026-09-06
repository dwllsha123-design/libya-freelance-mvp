'use client';

import type { ReactNode } from 'react';

type SidebarLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /**
   * When false, sidebar is only shown via the mobile slot (drawer handled by parent).
   * Desktop/tablet lg+: two-column grid.
   */
  className?: string;
  /** Desktop sidebar track */
  sidebarWidthClassName?: string;
};

/**
 * Adaptive sidebar + main distribution.
 * Desktop: grid columns. Below lg: main full-width (sidebar rendered separately as drawer).
 */
export function SidebarLayout({
  sidebar,
  children,
  className = '',
  sidebarWidthClassName = 'lg:w-[minmax(0,1fr)]',
}: SidebarLayoutProps) {
  void sidebarWidthClassName;
  return (
    <div
      className={`sidebar-layout grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] ${className}`}
    >
      <aside className="hidden min-w-0 lg:block">{sidebar}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
