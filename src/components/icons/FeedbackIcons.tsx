import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export const PassIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export const FailIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

export const RetryIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M1 4v6h6M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

export const BadgeIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3.85 8.75a4 4 0 0 0 4.12-2.36l.51-1.13a2 2 0 0 1 3.64 0l.51 1.13a4 4 0 0 0 4.12 2.36l1.12.12a2 2 0 0 1 1.56 2.63l-.59 1.11a4 4 0 0 0 0 3.72l.59 1.11a2 2 0 0 1-1.56 2.63l-1.12.12a4 4 0 0 0-4.12 2.36l-.51 1.13a2 2 0 0 1-3.64 0l-.51-1.13a4 4 0 0 0-4.12-2.36l-1.12-.12a2 2 0 0 1-1.56-2.63l.59-1.11a4 4 0 0 0 0-3.72L.74 11.5a2 2 0 0 1 1.56-2.63l1.12-.12z" />
  </svg>
);
