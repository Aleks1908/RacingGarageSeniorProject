import { api } from "../client/client";
import type {
  WorkOrderTaskCreate,
  WorkOrderTaskRead,
  WorkOrderTaskUpdate,
} from "./types";

export function listWorkOrderTasks(params?: { workOrderId?: number }) {
  const qs = new URLSearchParams();
  if (params?.workOrderId) qs.set("workOrderId", String(params.workOrderId));

  const path = qs.toString()
    ? `/api/work-order-tasks?${qs.toString()}`
    : "/api/work-order-tasks";

  return api<WorkOrderTaskRead[]>(path);
}

export function createWorkOrderTask(dto: WorkOrderTaskCreate) {
  return api<WorkOrderTaskRead>("/api/work-order-tasks", {
    method: "POST",
    auth: true,
    body: JSON.stringify(dto),
    headers: { "Content-Type": "application/json" },
  });
}

export function updateWorkOrderTask(id: number, dto: WorkOrderTaskUpdate) {
  return api<void>(`/api/work-order-tasks/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(dto),
    headers: { "Content-Type": "application/json" },
  });
}

export function deleteWorkOrderTask(id: number) {
  return api<void>(`/api/work-order-tasks/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
