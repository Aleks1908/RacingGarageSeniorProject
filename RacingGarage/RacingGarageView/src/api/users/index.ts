import { api } from "@/api/client/client";
import type {
  AuthRefreshResponse,
  ChangeUserPasswordDto,
  UpdateUserDto,
  UserCreate,
  UserRead,
  UserSetRole,
} from "./types";

export function listUsers() {
  return api<UserRead[]>("/api/users", { method: "GET" });
}

export function getUser(id: number) {
  return api<UserRead>(`/api/users/${id}`, { method: "GET" });
}

export function createUser(dto: UserCreate) {
  return api<UserRead>("/api/users", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function setUserRole(id: number, dto: UserSetRole) {
  return api<void>(`/api/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deactivateUser(id: number) {
  return api<void>(`/api/users/${id}/deactivate`, { method: "PUT" });
}

export function getMe() {
  return api<UserRead>("/api/users/me");
}

export function updateUser(dto: UpdateUserDto) {
  return api<AuthRefreshResponse>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function changeUserPassword(dto: ChangeUserPasswordDto) {
  return api<AuthRefreshResponse>("/api/users/me/password", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
