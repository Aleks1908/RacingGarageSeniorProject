import { api } from "@/api/client/client";
import type { WorkOrderRead } from "@/api/shared/types";
import type { WorkOrderCreate, WorkOrderUpdate } from "./types";
import type { WorkOrderDetails } from "./types";

export function listWorkOrders(params?: {
  teamCarId?: number;
  status?: string;
  priority?: string;
}) {
  const q = new URLSearchParams();
  if (params?.teamCarId) q.set("teamCarId", String(params.teamCarId));
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);

  const qs = q.toString();
  return api<WorkOrderRead[]>(`/api/work-orders${qs ? `?${qs}` : ""}`);
}

export function createWorkOrder(dto: WorkOrderCreate) {
  return api<WorkOrderRead>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateWorkOrder(id: number, dto: WorkOrderUpdate) {
  return api<void>(`/api/work-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteWorkOrder(id: number) {
  return api<void>(`/api/work-orders/${id}`, { method: "DELETE" });
}

export function getWorkOrderDetails(id: number) {
  return api<WorkOrderDetails>(`/api/work-orders/${id}/details`);
}
