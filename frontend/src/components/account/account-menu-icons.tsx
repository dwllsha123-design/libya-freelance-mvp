type IconProps = { className?: string };

function Svg({
  className = 'h-5 w-5',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconDashboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

export function IconBriefcase({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" />
    </Svg>
  );
}

export function IconFileText({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </Svg>
  );
}

export function IconMessage({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0Z" />
    </Svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </Svg>
  );
}

export function IconImages({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="14" height="12" rx="2" />
      <path d="M7 17h14v-8a2 2 0 0 0-2-2h-2" />
      <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="m7 14 2.5-2.5L13 14" />
    </Svg>
  );
}

export function IconAward({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 21l5-2 5 2-1.5-7.5" />
    </Svg>
  );
}

export function IconCoins({ className }: IconProps) {
  return (
    <Svg className={className}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
    </Svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m12 3 2.4 5.4L20 9.3l-4 3.8 1.1 5.9L12 16.8 6.9 19l1.1-5.9-4-3.8 5.6-.9Z" />
    </Svg>
  );
}

export function IconHelp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.4 1-1.4 1.7V14" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 11a8 8 0 1 1-2.2-5.5" />
      <path d="M21 4v5h-5" />
    </Svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" />
      <path d="M15 12H8" />
      <path d="m13 8 4 4-4 4" />
    </Svg>
  );
}

export function IconAdmin({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </Svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}
