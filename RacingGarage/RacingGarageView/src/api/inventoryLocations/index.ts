import { api } from "../client/client";
import type {
  InventoryLocationCreate,
  InventoryLocationRead,
  InventoryLocationUpdate,
} from "./types";

export type ListInventoryLocationsParams = {
  activeOnly?: boolean;
};

export function listInventoryLocations(
  params: ListInventoryLocationsParams = {}
) {
  const qs = new URLSearchParams();
  if (params.activeOnly === true) qs.set("activeOnly", "true");

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<InventoryLocationRead[]>(`/api/inventory-locations${suffix}`);
}

export function getInventoryLocation(id: number) {
  return api<InventoryLocationRead>(`/api/inventory-locations/${id}`);
}

export function createInventoryLocation(dto: InventoryLocationCreate) {
  return api<InventoryLocationRead>(`/api/inventory-locations`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateInventoryLocation(
  id: number,
  dto: InventoryLocationUpdate
) {
  return api<void>(`/api/inventory-locations/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteInventoryLocation(id: number) {
  return api<void>(`/api/inventory-locations/${id}`, {
    method: "DELETE",
  });
}
