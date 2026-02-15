import React, { useMemo, useState } from "react";
import type { LoginResponse } from "@/api/auth";
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from "./auth-context";

const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );

  const [user, setUser] = useState<AuthState["user"]>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthState["user"]) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      setSession: (resp: LoginResponse) => {
        setToken(resp.accessToken);
        const u = {
          expiresAtUtc: resp.expiresAtUtc,
          userId: resp.userId,
          name: resp.name,
          email: resp.email,
          roles: resp.roles,
        };
        setUser(u);
        localStorage.setItem(TOKEN_KEY, resp.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      },
      logout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
