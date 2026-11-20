interface WorldLensLogoProps {
  size?: number;
  variant?: 'on-dark' | 'on-light';
  className?: string;
}

export function WorldLensLogo({
  size = 36,
  variant = 'on-dark',
  className = '',
}: WorldLensLogoProps) {
  const outerStroke = variant === 'on-dark' ? '#FFFFFF' : '#071428';
  const accentFill = '#1A6BFF';
  const coreFill = variant === 'on-dark' ? '#FFFFFF' : '#071428';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill={variant === 'on-dark' ? '#0D2140' : '#071428'}
        stroke={variant === 'on-dark' ? 'rgba(255,255,255,0.14)' : '#071428'}
        strokeWidth="1.5"
      />
      <circle
        cx="24"
        cy="24"
        r="13.5"
        stroke={variant === 'on-dark' ? outerStroke : '#FFFFFF'}
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M14.5 18.5C16.8 14.2 21.8 12.2 26.5 13.5"
        stroke={accentFill}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M33.5 29.5C31.2 33.8 26.2 35.8 21.5 34.5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="6" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="24" r="2.4" fill={accentFill} />
      <circle
        cx="28.5"
        cy="19.5"
        r="1.25"
        fill={variant === 'on-dark' ? coreFill : '#FFFFFF'}
        fillOpacity="0.85"
      />
    </svg>
  );
}
