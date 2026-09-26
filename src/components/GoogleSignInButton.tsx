import { useEffect, useRef } from 'react';

// Reuses the same Google Cloud OAuth client already configured (via ZASP,
// for the classic wp-login.php flow) - see nors-auth.php's google-login
// endpoint, which verifies tokens against this same client ID. This is the
// public Client ID, safe to ship in frontend code (unlike a client secret).
const GOOGLE_CLIENT_ID = '547446426995-sav89a3p9qlm2lktu71r8ib8gad5lrd3.apps.googleusercontent.com';

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    use_fedcm_for_prompt?: boolean;
    use_fedcm_for_button?: boolean;
    itp_support?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme: string; size: string; width: number; text: string; shape?: string }
  ) => void;
  prompt: () => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  onToken: (idToken: string) => void;
}

// Load Google's script once, as soon as this module is imported, so the button
// is ready the moment the login page opens instead of appearing a beat later.
let scriptPromise: Promise<void> | null = null;
function loadGoogle(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}
if (typeof window !== 'undefined') void loadGoogle();

export default function GoogleSignInButton({ onToken }: GoogleSignInButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(onToken);
  tokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;

    void loadGoogle().then(() => {
      if (cancelled || !window.google || !ref.current) return;
      const gid = window.google.accounts.id;
      // FedCM makes Chrome show its own account picker in place, so there is
      // no redirect to a separate accounts.google.com page.
      gid.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => tokenRef.current(response.credential),
        use_fedcm_for_prompt: true,
        use_fedcm_for_button: true,
        itp_support: true,
        cancel_on_tap_outside: false,
      });
      const width = Math.min(360, Math.max(240, ref.current.parentElement?.clientWidth ?? 360));
      gid.renderButton(ref.current, {
        theme: 'filled_black',
        size: 'large',
        width,
        text: 'continue_with',
        shape: 'rectangular',
      });
      // One Tap: the native "Continue as ..." sheet appears straight away.
      gid.prompt();
    });

    return () => {
      cancelled = true;
      window.google?.accounts.id.cancel();
    };
  }, []);

  // Reserve the button's height so the page does not jump when it appears.
  return <div ref={ref} className="flex justify-center min-h-[44px]" />;
}
