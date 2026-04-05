type IconProps = {
  className?: string;
};

function iconProps(className?: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="5" rx="1.5" />
      <rect x="13" y="11" width="7" height="9" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function CatalogIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 5.5h12" />
      <path d="M6 12h12" />
      <path d="M6 18.5h12" />
      <circle cx="4.5" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 3 .6 1.8L21 5.5l-1.9.7-.6 1.8-.6-1.8L16 5.5l1.9-.7.6-1.8Z" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m4 20 4.5-1 9-9a2.2 2.2 0 1 0-3.1-3.1l-9 9L4 20Z" />
      <path d="M13.5 6.5 17 10" />
    </svg>
  );
}
