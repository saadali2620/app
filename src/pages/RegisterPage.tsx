import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export default function RegisterPage({ navigate }: RegisterPageProps) {
  const { register, loginWithGoogle } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, firstName, lastName, marketingOptIn);
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      await loginWithGoogle(idToken);
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with Google.');
    }
  };

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-6">
      <div className="max-w-[400px] mx-auto">
        <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-4 text-center">Join nors.</p>
        <h1 className="text-white text-2xl sm:text-3xl font-medium mb-8 text-center">Create Account</h1>

        <GoogleSignInButton onToken={handleGoogle} />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/40 text-[11px] uppercase tracking-[0.15em]">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-1/2 bg-transparent border border-white/20 focus:border-white/50 text-white text-sm px-4 py-3.5 outline-none transition-colors placeholder:text-white/30"
            />
            <input
              type="text"
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-1/2 bg-transparent border border-white/20 focus:border-white/50 text-white text-sm px-4 py-3.5 outline-none transition-colors placeholder:text-white/30"
            />
          </div>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border border-white/20 focus:border-white/50 text-white text-sm px-4 py-3.5 outline-none transition-colors placeholder:text-white/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border border-white/20 focus:border-white/50 text-white text-sm px-4 py-3.5 outline-none transition-colors placeholder:text-white/30"
          />
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-white"
            />
            <span className="text-white/50 text-xs leading-relaxed">
              Email me about new drops, restocks and offers. Unsubscribe anytime.
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3.5 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-white/50 text-sm text-center mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-white underline underline-offset-2">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
