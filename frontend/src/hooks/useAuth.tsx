import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getUser } from '../services/api';

interface User { id: string; name: string; email: string; language?: string; }
interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  clearError: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (u) setUser(u);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError('');
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(err.status === 401 ? 'Invalid email or password.' : msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setError('');
    try {
      const data = await apiRegister(name, email, password);
      setUser(data.user);
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setError(err.status === 400 ? 'Email already registered.' : msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, loading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
