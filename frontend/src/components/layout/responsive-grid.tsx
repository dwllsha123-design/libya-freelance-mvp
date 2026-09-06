import type { ReactNode } from 'react';

type ResponsiveGridProps = {
  children: ReactNode;
  className?: string;
  /**
   * Minimum card width before wrapping (px).
   * Uses CSS auto-fit for true redistribution by available width.
   */
  minItemWidth?: number;
  /** Gap token */
  gap?: 'sm' | 'md' | 'lg';
};

const GAP: Record<NonNullable<ResponsiveGridProps['gap']>, string> = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-5 lg:gap-6',
  lg: 'gap-5 sm:gap-6 lg:gap-8',
};

/**
 * Adaptive card grid — columns grow/shrink with container width.
 */
export function ResponsiveGrid({
  children,
  className = '',
  minItemWidth = 280,
  gap = 'md',
}: ResponsiveGridProps) {
  return (
    <div
      className={`responsive-grid ${GAP[gap]} ${className}`}
      style={{
        // CSS custom property consumed by .responsive-grid
        ['--rg-min' as string]: `${minItemWidth}px`,
      }}
    >
      {children}
    </div>
  );
}
