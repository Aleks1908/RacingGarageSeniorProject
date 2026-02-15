import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { JSX } from "react";

type Props = {
  allow: string[];
  children: JSX.Element;
};

export default function RequireRole({ allow, children }: Props) {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  const roles = user?.roles ?? [];
  const ok = roles.some((r) => allow.includes(r));

  if (!ok) return <Navigate to="/dashboard" replace />;

  return children;
}
