import { api } from "../client/client";
import type { PartCreate, PartRead, PartUpdate } from "./types";

export type PartsListParams = {
  activeOnly?: boolean;
  q?: string;
};

export function listParts(params?: PartsListParams) {
  const sp = new URLSearchParams();
  if (params?.activeOnly) sp.set("activeOnly", "true");
  if (params?.q) sp.set("q", params.q);

  const qs = sp.toString();
  return api<PartRead[]>(`/api/parts${qs ? `?${qs}` : ""}`);
}

export function getPart(id: number) {
  return api<PartRead>(`/api/parts/${id}`);
}

export function createPart(dto: PartCreate) {
  return api<PartRead>(`/api/parts`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updatePart(id: number, dto: PartUpdate) {
  return api<void>(`/api/parts/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deletePart(id: number) {
  return api<void>(`/api/parts/${id}`, {
    method: "DELETE",
  });
}
