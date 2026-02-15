import { createContext } from "react";
import type { LoginResponse } from "@/api/auth";

export type AuthState = {
  token: string | null;
  user: Omit<LoginResponse, "accessToken"> | null;
};

export type AuthContextValue = AuthState & {
  setSession: (resp: LoginResponse) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
