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

// A parcel waiting to be sent: three hexagons, each 3.4 inside the last.
export function ShipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.00 3.00L27.26 9.50L27.26 22.50L16.00 29.00L4.74 22.50L4.74 9.50z" />
      <path d="M16.00 6.92L23.86 11.46L23.86 20.54L16.00 25.08L8.14 20.54L8.14 11.46z" style={ECHO} />
      <path d="M16.00 10.85L20.46 13.43L20.46 18.57L16.00 21.15L11.54 18.57L11.54 13.42z" />
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

// A star, for reviews: the inner star is inset a true 3.4 all the way round.
export function ReviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.00 2.60L20.35 10.61L29.31 12.27L23.04 18.89L24.23 27.93L16.00 24.00L7.77 27.93L8.96 18.89L2.69 12.27L11.65 10.61z" />
      <path d="M16.00 9.73L18.14 13.66L22.54 14.48L19.46 17.72L20.04 22.16L16.00 20.23L11.96 22.16L12.54 17.72L9.46 14.48L13.86 13.66z" style={ECHO} />
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
