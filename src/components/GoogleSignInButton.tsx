import { useEffect, useRef } from 'react';

// Reuses the same Google Cloud OAuth client already configured (via ZASP,
// for the classic wp-login.php flow) - see nors-auth.php's google-login
// endpoint, which verifies tokens against this same client ID. This is the
// public Client ID, safe to ship in frontend code (unlike a client secret).
const GOOGLE_CLIENT_ID = '547446426995-sav89a3p9qlm2lktu71r8ib8gad5lrd3.apps.googleusercontent.com';

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme: string; size: string; width: number; text: string }
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  onToken: (idToken: string) => void;
}

export default function GoogleSignInButton({ onToken }: GoogleSignInButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onToken(response.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'filled_black',
        size: 'large',
        width: 360,
        text: 'continue_with',
      });
    };

    if (window.google) {
      render();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [onToken]);

  return <div ref={ref} className="flex justify-center" />;
}
