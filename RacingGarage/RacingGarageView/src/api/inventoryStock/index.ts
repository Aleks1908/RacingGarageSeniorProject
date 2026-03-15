import { api } from "../client/client";
import type { InventoryStockAdjustRequest, InventoryStockRead } from "./types";

export type ListInventoryStockParams = {
  partId?: number;
  locationId?: number;
};

export function listInventoryStock(params: ListInventoryStockParams = {}) {
  const qs = new URLSearchParams();
  if (params.partId) qs.set("partId", String(params.partId));
  if (params.locationId) qs.set("locationId", String(params.locationId));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<InventoryStockRead[]>(`/api/inventory-stock${suffix}`);
}

export function adjustInventoryStock(dto: InventoryStockAdjustRequest) {
  return api<InventoryStockRead>(`/api/inventory-stock/adjust`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
