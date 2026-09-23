import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import { getItem, setItem } from './storage';
import type { Me } from './types';

type AuthCtx = {
  ready: boolean;
  user: Me | null;
  signIn: (token: string, user: Me) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<Me | null>;
  setUser: (u: Me) => void;
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await setItem('authToken', null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api<{ user: Me }>('/me');
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { signOut(); });
    (async () => {
      const token = await getItem('authToken');
      if (token) {
        setAuthToken(token);
        await refresh();
      }
      setReady(true);
    })();
  }, [refresh, signOut]);

  const signIn = useCallback(async (token: string, me: Me) => {
    setAuthToken(token);
    await setItem('authToken', token);
    setUser(me);
  }, []);

  const value = useMemo(() => ({ ready, user, signIn, signOut, refresh, setUser }), [ready, user, signIn, signOut, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
