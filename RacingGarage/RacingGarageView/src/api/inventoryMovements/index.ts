import { api } from "../client/client";
import type { InventoryMovementRead } from "./types";

export type ListInventoryMovementsParams = {
  partId?: number;
  locationId?: number;
  workOrderId?: number;
  reason?: string;
};

export function listInventoryMovements(
  params: ListInventoryMovementsParams = {}
) {
  const qs = new URLSearchParams();
  if (params.partId) qs.set("partId", String(params.partId));
  if (params.locationId) qs.set("locationId", String(params.locationId));
  if (params.workOrderId) qs.set("workOrderId", String(params.workOrderId));
  if (params.reason) qs.set("reason", params.reason);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<InventoryMovementRead[]>(`/api/inventory-movements${suffix}`);
}
