import React, { useMemo, useState } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from "./auth-context";
import type { LoginResponse } from "@/api/auth/types";
import type { AuthRefreshResponse } from "@/api/users/types";

const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  return atob(padded);
}

function getJwtExpiresAtUtc(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const json = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    if (!json.exp) return null;

    return new Date(json.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

type SessionLike = LoginResponse | AuthRefreshResponse;

function normalizeSession(resp: SessionLike) {
  if ("accessToken" in resp) {
    return {
      accessToken: resp.accessToken,
      expiresAtUtc: resp.expiresAtUtc,
      userId: resp.userId,
      name: resp.name,
      email: resp.email,
      roles: resp.roles,
    };
  }

  return {
    accessToken: resp.token,
    expiresAtUtc: getJwtExpiresAtUtc(resp.token) ?? new Date().toISOString(),
    userId: resp.user.id,
    name: resp.user.name,
    email: resp.user.email,
    roles: resp.user.roles,
  };
}

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
      setSession: (resp: SessionLike) => {
        const s = normalizeSession(resp);

        setToken(s.accessToken);

        const u = {
          expiresAtUtc: s.expiresAtUtc,
          userId: s.userId,
          name: s.name,
          email: s.email,
          roles: s.roles,
        };

        setUser(u);
        localStorage.setItem(TOKEN_KEY, s.accessToken);
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
