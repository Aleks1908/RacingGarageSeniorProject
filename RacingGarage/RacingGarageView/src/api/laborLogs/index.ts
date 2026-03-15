import { api } from "../client/client";
import type { LaborLogCreate, LaborLogRead, LaborLogUpdate } from "./types";

export function listLaborLogs(params?: { workOrderTaskId?: number }) {
  const qs = new URLSearchParams();
  if (params?.workOrderTaskId)
    qs.set("workOrderTaskId", String(params.workOrderTaskId));

  const path = qs.toString()
    ? `/api/labor-logs?${qs.toString()}`
    : "/api/labor-logs";

  return api<LaborLogRead[]>(path);
}

export function createLaborLog(dto: LaborLogCreate) {
  return api<LaborLogRead>("/api/labor-logs", {
    method: "POST",
    auth: true,
    body: JSON.stringify(dto),
    headers: { "Content-Type": "application/json" },
  });
}

export function updateLaborLog(id: number, dto: LaborLogUpdate) {
  return api<void>(`/api/labor-logs/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(dto),
    headers: { "Content-Type": "application/json" },
  });
}

export function deleteLaborLog(id: number) {
  return api<void>(`/api/labor-logs/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
