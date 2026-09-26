// Original nors. account icons, drawn in the same language as the nors. coin:
// a crisp outer line plus a fainter inner echo, in currentColor on a 32px grid.
interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

// The inner echo line: the same colour as the outer line at 45%, but fully solid.
const ECHO = { stroke: 'color-mix(in srgb, currentColor 45%, black)' };

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
      <path d="M16 8.2 22.6 12v8L16 23.8 9.4 20v-8z" style={ECHO} />
    </Svg>
  );
}

// A delivery van on its way.
export function ReceiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.7 20H3V8h16v12h-6.7" />
      <path d="M19.7 20H19v-8h5.2L28 16.2V20h-1.7" />
      <circle cx="9" cy="21.2" r="2.6" />
      <circle cx="23" cy="21.2" r="2.6" />
      <path d="M5.6 10.6h10.8v6.8H5.6z" style={ECHO} />
    </Svg>
  );
}

// A star, for reviews.
export function ReviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.00 3.60L19.12 12.31L28.36 12.58L21.04 18.24L23.64 27.12L16.00 21.90L8.36 27.12L10.96 18.24L3.64 12.58L12.88 12.31z" />
      <path d="M16.00 10.00L17.59 14.42L22.28 14.56L18.57 17.43L19.88 21.94L16.00 19.30L12.12 21.94L13.43 17.43L9.72 14.56L14.41 14.42z" style={ECHO} />
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
