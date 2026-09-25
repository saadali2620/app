// Original nors. account icons: solid glyphs on a 32px grid,
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
      fill="currentColor"
      fillRule="evenodd"
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
      <path d="M16 3 4.5 8.9 16 14.8l11.5-5.9z" />
      <path d="M4 11.4 15.1 17.1V29L4 23.3z" />
      <path d="M28 11.4 16.9 17.1V29L28 23.3z" />
    </Svg>
  );
}

// A delivery van on its way.
export function ReceiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 6.5h17.5v14H2z" />
      <path d="M21.5 10.5h5l4 5v5h-9z" />
      <path d="M8.5 21.5a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm0 2.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z" />
      <path d="M24.5 21.5a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm0 2.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z" />
    </Svg>
  );
}

// A speech bubble with a star cut out of it.
export function ReviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4h20a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H15.5L9 29.5V24H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM16 7.8l1.59 4.22 4.5.2-3.52 2.81 1.19 4.35L16 16.9l-3.76 2.48 1.19-4.35-3.52-2.81 4.5-.2z" />
    </Svg>
  );
}

// A solid star. When filled is false it fades back, for rating pickers.
export function StarIcon({ filled = true, ...props }: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillOpacity={filled ? 1 : 0.28}
        d="M16 3l3.7 8.6 9.3.8-7 6.2 2.1 9.1L16 22.9 7.9 27.7 10 18.6 3 12.4l9.3-.8z"
      />
    </Svg>
  );
}

// A coin with a star cut out of it.
export function PointsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26zM16 10l1.47 3.98 4.24.17-3.33 2.62 1.15 4.08L16 18.5l-3.53 2.35 1.15-4.08-3.33-2.62 4.24-.17z" />
    </Svg>
  );
}

// An envelope.
export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7.5h25L16 16.7z" />
      <path d="M3 10.4l13 9.4 13-9.4V23a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  );
}
