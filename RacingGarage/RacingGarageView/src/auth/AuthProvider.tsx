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
    "=",
  );
  return atob(padded);
}

function parseJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getJwtExpiresAtUtc(token: string): string | null {
  const json = parseJwtPayload(token);
  if (!json?.exp) return null;
  return new Date((json.exp as number) * 1000).toISOString();
}

function extractNameFromJwt(token: string): {
  firstName: string;
  lastName: string;
} {
  const payload = parseJwtPayload(token);
  const name = (payload?.name as string) || "";
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  return {
    firstName: name || "Unknown",
    lastName: "",
  };
}

type SessionLike = LoginResponse | AuthRefreshResponse;

function normalizeSession(resp: SessionLike) {
  if ("accessToken" in resp) {
    const names = extractNameFromJwt(resp.accessToken);

    return {
      accessToken: resp.accessToken,
      expiresAtUtc: resp.expiresAtUtc,
      userId: resp.userId,
      firstName: names.firstName,
      lastName: names.lastName,
      email: resp.email,
      roles: resp.roles,
    };
  }

  const names = extractNameFromJwt(resp.token);
  return {
    accessToken: resp.token,
    expiresAtUtc: getJwtExpiresAtUtc(resp.token) ?? new Date().toISOString(),
    userId: resp.user.id,
    firstName: names.firstName,
    lastName: names.lastName,
    email: resp.user.email,
    roles: resp.user.roles,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const [user, setUser] = useState<AuthState["user"]>(() => {
    const raw = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!raw || !storedToken) return null;

    const parsed = JSON.parse(raw) as AuthState["user"];
    const names = extractNameFromJwt(storedToken);

    return {
      ...parsed,
      firstName: names.firstName,
      lastName: names.lastName,
    };
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
          firstName: s.firstName,
          lastName: s.lastName,
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
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
