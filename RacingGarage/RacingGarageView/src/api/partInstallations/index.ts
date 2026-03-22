import { api } from "../client/client";
import type { PartInstallationCreate, PartInstallationRead } from "./types";

export function listPartInstallations(params?: { workOrderId?: number }) {
  const qs = new URLSearchParams();
  if (params?.workOrderId) qs.set("workOrderId", String(params.workOrderId));

  const path = qs.toString()
    ? `/api/part-installations?${qs.toString()}`
    : "/api/part-installations";

  return api<PartInstallationRead[]>(path);
}

export function createPartInstallation(dto: PartInstallationCreate) {
  return api<PartInstallationRead>("/api/part-installations", {
    method: "POST",
    auth: true,
    body: JSON.stringify(dto),
    headers: { "Content-Type": "application/json" },
  });
}

export function deletePartInstallation(id: number) {
  if (!Number.isFinite(id) || id <= 0)
    throw new Error("Invalid installation id.");
  return api<void>(`/api/part-installations/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
