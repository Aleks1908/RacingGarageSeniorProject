import { api } from "../client/client";
import type { SupplierCreate, SupplierRead, SupplierUpdate } from "./types";

export function listSuppliers(params?: { activeOnly?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.activeOnly) qs.set("activeOnly", "true");
  const q = qs.toString();
  return api<SupplierRead[]>(`/api/suppliers${q ? `?${q}` : ""}`);
}

export function createSupplier(dto: SupplierCreate) {
  return api<SupplierRead>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateSupplier(id: number, dto: SupplierUpdate) {
  return api<void>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteSupplier(id: number) {
  return api<void>(`/api/suppliers/${id}`, { method: "DELETE" });
}
