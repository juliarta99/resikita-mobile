import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  getMe,
  tokenStore,
  verifyRegister,
} from "../lib/api";

type User = {
  id: number;
  name: string;
  nik: string | null;
  phone: string;
  kode_qr: string;
  saldo: number;
  roles: string[];
  [k: string]: any;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  register: typeof apiRegister;
  verifyOtp: (phone: string, kode: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const token = await tokenStore.get();
      if (token) setUser(await getMe());
    } catch {
      await tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const finishAuth = async (token: string, u: User) => {
    await tokenStore.set(token);
    setUser(u);
  };

  const value: AuthCtx = {
    user,
    loading,
    register: apiRegister,
    verifyOtp: async (phone, kode) => {
      const res = await verifyRegister(phone, kode);
      await finishAuth(res.data.token, res.data.user);
    },
    login: async (identifier, password) => {
      const res = await apiLogin(identifier, password);
      await finishAuth(res.data.token, res.data.user);
    },
    logout: async () => {
      try {
        await apiLogout();
      } catch {}
      await tokenStore.clear();
      setUser(null);
    },
    refresh: loadMe,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
