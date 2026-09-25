// Original nors. account icons: thin geometric line drawings on a 32px grid,
// drawn in currentColor so they inherit the surrounding text colour.
interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

function Svg({ size = 32, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// A parcel waiting to be sent.
export function ShipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 4 5 9.5v13L16 28l11-5.5v-13z" />
      <path d="M5 9.5 16 15l11-5.5" />
      <path d="M16 15v13" />
      <path d="m10.5 6.8 11 5.5" />
    </Svg>
  );
}

// A delivery van on its way.
export function ReceiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9h16v13H3z" />
      <path d="M19 13h5l5 4.5V22H19z" />
      <circle cx="9" cy="23.5" r="2.5" />
      <circle cx="23" cy="23.5" r="2.5" />
      <path d="M7 13h8" />
    </Svg>
  );
}

// A speech bubble holding a star.
export function ReviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6h22v16H14l-6 5v-5H5z" />
      <path d="m16 9.5 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
    </Svg>
  );
}

// A five-point star, optionally filled (used for ratings).
export function StarIcon({ filled, ...props }: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="m16 4 3.7 7.6 8.3 1.2-6 5.9 1.4 8.3L16 22.9l-7.4 3.9 1.4-8.3-6-5.9 8.3-1.2z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </Svg>
  );
}

// A coin: outer rim, inner rim and the nors. triangle.
export function PointsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="8.6" opacity="0.45" />
      <path d="m16 10.8 4.7 8.1h-9.4z" />
    </Svg>
  );
}

// An envelope.
export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h24v16H4z" />
      <path d="m4 9 12 8.5L28 9" />
    </Svg>
  );
}
