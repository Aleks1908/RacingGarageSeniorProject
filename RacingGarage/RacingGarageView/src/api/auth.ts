import { apiFetch } from "../api/client";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  userId: number;
  name: string;
  email: string;
  roles: string[];
};

export function login(dto: LoginRequest) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
