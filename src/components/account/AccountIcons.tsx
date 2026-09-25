// Original nors. account icons: every glyph sits inside the nors. coin
// (outer rim + fainter inner rim), drawn in currentColor on a 32px grid.
interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

function Coin({ size = 32, className, children }: IconProps & { children: React.ReactNode }) {
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
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="8.6" opacity="0.45" />
      {children}
    </svg>
  );
}

// A parcel waiting to be sent.
export function ShipIcon(props: IconProps) {
  return (
    <Coin {...props}>
      <path d="M16 10.6 21 13.3v5.4L16 21.4l-5-2.7v-5.4z" />
      <path d="m11 13.3 5 2.7 5-2.7" />
      <path d="M16 16v5.4" />
    </Coin>
  );
}

// A delivery van on its way.
export function ReceiveIcon(props: IconProps) {
  return (
    <Coin {...props}>
      <path d="M10.6 12.6h6.2v6.2h-6.2z" />
      <path d="M16.8 14.6h2.6l2 2.2v2h-4.6" />
      <circle cx="13" cy="19.6" r="1" />
      <circle cx="19" cy="19.6" r="1" />
    </Coin>
  );
}

// A star, for reviews.
export function ReviewIcon(props: IconProps) {
  return (
    <Coin {...props}>
      <path d="m16 10.6 1.65 3.35 3.7.55-2.7 2.6.65 3.7L16 19.05l-3.3 1.75.65-3.7-2.7-2.6 3.7-.55z" />
    </Coin>
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

// The nors. coin itself: outer rim, inner rim and the nors. triangle.
export function PointsIcon(props: IconProps) {
  return (
    <Coin {...props}>
      <path d="m16 10.8 4.7 8.1h-9.4z" />
    </Coin>
  );
}

// An envelope.
export function MailIcon(props: IconProps) {
  return (
    <Coin {...props}>
      <path d="M11 12.6h10v6.8H11z" />
      <path d="m11 13.2 5 3.8 5-3.8" />
    </Coin>
  );
}
