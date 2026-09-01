'use client';

import { useTheme } from '@/contexts/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg border border-outline-variant/50 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container-low"
      aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
    </button>
  );
}
