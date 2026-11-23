'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CLIENT' | 'PRINTER_PROVIDER' | 'DELIVERY_PROVIDER';
  phone?: string;
  tenantId?: string;
  walletBalanceAed?: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  setUserSession: (user: UserSession, token: string) => void;
  fetchWithAuth: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const locale = useLocale();

  // Restore session on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('j3d_token');
      const storedUser = localStorage.getItem('j3d_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUserSession = (newUser: UserSession, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('j3d_token', newToken);
    localStorage.setItem('j3d_user', JSON.stringify(newUser));
  };

  const login = async (email: string, password: string): Promise<UserSession> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || 'Login failed');
    }

    const userData = data.data?.user || data.user;
    const tokenData = data.data?.token || data.token;

    if (!userData || !tokenData) {
      throw new Error('Invalid authentication response from server');
    }

    setUserSession(userData, tokenData);
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('j3d_token');
      localStorage.removeItem('j3d_user');
      router.push(`/${locale}`);
    }
  };

  const fetchWithAuth = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    headers.set('x-tenant-id', user?.tenantId || 'msoms-uae');

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        setUserSession,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
