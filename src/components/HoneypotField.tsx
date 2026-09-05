import type { ChangeEvent } from 'react';

interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Hidden field real shoppers never see or fill in. Bots that auto-fill every
 * input on a page will fill this one — if it arrives non-empty, the WP mu-plugin
 * (nors-turnstile-honeypot.php) rejects the order.
 */
export function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <input
      type="text"
      name="website_hp"
      value={value}
      onChange={handleChange}
      autoComplete="off"
      tabIndex={-1}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
