// Original nors. account icons, built like the nors. coin: a crisp outer line,
// an inner line inset by the same 3.4 units, then a small mark at the centre.
// Everything is drawn on a 32px grid with solid strokes (no transparency), so
// crossings never look brighter than the rest of the line.
interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

// Solid colour of the outer lines, and the same colour at 45% strength over black.
const INK = '#cccccc';
const ECHO = { stroke: 'color-mix(in srgb, #cccccc 45%, black)' };

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
      style={{ color: INK }}
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
      <path d="M16.00 3.00L27.26 9.50L27.26 22.50L16.00 29.00L4.74 22.50L4.74 9.50z" />
      <path d="M16.00 6.92L23.86 11.46L23.86 20.54L16.00 25.08L8.14 20.54L8.14 11.46z" style={ECHO} />
      <path d="M16.00 10.80L20.50 13.40L20.50 18.60L16.00 21.20L11.50 18.60L11.50 13.40z" />
      <path d="M11.50 13.40L16 16L20.50 13.40M16 16L16.00 21.20" />
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
      <path d="M6.4 11.4h9.2v5.7H6.4z" style={ECHO} />
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

// The nors. coin: outer rim, inner rim (3.4 inside) and the nors. triangle.
export function PointsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="8.6" style={ECHO} />
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
      <path d="M7 12.6h18v9.4H7z" style={ECHO} />
    </Svg>
  );
}
