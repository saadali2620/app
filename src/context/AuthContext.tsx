import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authApi from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, marketingOptIn?: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'nors_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore the session from a saved token. If the token
  // has expired or the account no longer exists, quietly drop it rather
  // than surfacing an error - the person just ends up logged out.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    authApi
      .getMe(stored)
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyAuth = (u: AuthUser) => {
    setUser(u);
    setToken(u.token);
    localStorage.setItem(STORAGE_KEY, u.token);
  };

  const login = async (email: string, password: string) => {
    applyAuth(await authApi.login(email, password));
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    marketingOptIn = false
  ) => {
    applyAuth(await authApi.register(email, password, firstName, lastName, marketingOptIn));
  };

  const loginWithGoogle = async (idToken: string) => {
    applyAuth(await authApi.googleLogin(idToken));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshMe = async () => {
    if (!token) return;
    setUser(await authApi.getMe(token));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, loginWithGoogle, logout, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
