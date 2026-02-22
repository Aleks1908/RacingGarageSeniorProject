import { api } from "@/api/client/client";
import type { LoginRequest, LoginResponse } from "./types";

export type { LoginRequest, LoginResponse };

export function login(dto: LoginRequest) {
  return api<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
    auth: false,
  });
}
