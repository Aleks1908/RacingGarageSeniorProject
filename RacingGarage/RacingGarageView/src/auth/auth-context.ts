import type { LoginResponse } from "@/api/auth/types";
import type { AuthRefreshResponse } from "@/api/users/types";
import { createContext } from "react";

export type AuthState = {
  token: string | null;
  user: Omit<LoginResponse, "accessToken"> | null;
};

export type AuthContextValue = AuthState & {
  setSession: (resp: LoginResponse | AuthRefreshResponse) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
