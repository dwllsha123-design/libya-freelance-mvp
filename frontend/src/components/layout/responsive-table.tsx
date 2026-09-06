import type { ReactNode } from 'react';

type ResponsiveTableProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Contain table overflow to the table region — never the page.
 */
export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`responsive-table -mx-1 min-w-0 overflow-x-auto px-1 ${className}`}>
      {children}
    </div>
  );
}
