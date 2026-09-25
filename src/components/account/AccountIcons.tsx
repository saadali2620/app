// Original nors. account icons, drawn in the same language as the nors. coin:
// a crisp outer line plus a fainter inner echo, in currentColor on a 32px grid.
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
      <path d="M16 3.5 27 9.75v12.5L16 28.5 5 22.25V9.75z" />
      <path d="m5 9.75 11 6.25 11-6.25" />
      <path d="M16 16v12.5" />
      <path d="M16 8.2 22.6 12v8L16 23.8 9.4 20v-8z" opacity="0.45" />
    </Svg>
  );
}

// A delivery van on its way.
export function ReceiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h16v13H3z" />
      <path d="M19 12h5l4 4.5V21H19" />
      <circle cx="9" cy="23.5" r="2.6" />
      <circle cx="23" cy="23.5" r="2.6" />
      <path d="M6.2 11.2h10.6v6.6H6.2z" opacity="0.45" />
    </Svg>
  );
}

// A star, for reviews.
export function ReviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m16 3.5 3.8 8.1 8.7 1.1-6.4 6 1.7 8.7L16 23.1l-7.8 4.3 1.7-8.7-6.4-6 8.7-1.1z" />
      <path d="m16 9.5 1.9 4 4.3.6-3.2 3 .85 4.3L16 21.5l-3.85 1.9.85-4.3-3.2-3 4.3-.6z" opacity="0.45" />
    </Svg>
  );
}

// A solid star. When filled is false it fades back, for rating pickers.
export function StarIcon({ size = 32, className, filled = true }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillOpacity={filled ? 1 : 0.28}
        d="M16 3l3.7 8.6 9.3.8-7 6.2 2.1 9.1L16 22.9 7.9 27.7 10 18.6 3 12.4l9.3-.8z"
      />
    </svg>
  );
}

// The nors. coin: outer rim, inner rim and the nors. triangle.
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
      <path d="M3 7h26v18H3z" />
      <path d="m3 8 13 10L29 8" />
      <path d="M7 12.6h18v9.4H7z" opacity="0.45" />
    </Svg>
  );
}
