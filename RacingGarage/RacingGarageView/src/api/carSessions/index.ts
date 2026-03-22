import { api } from "../client/client";
import type {
  CarSessionCreate,
  CarSessionRead,
  CarSessionUpdate,
} from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

export async function listCarSessions(): Promise<CarSessionRead[]> {
  return api<CarSessionRead[]>("/api/car-sessions", { method: "GET" });
}

export async function createCarSession(
  payload: CarSessionCreate
): Promise<CarSessionRead> {
  return api<CarSessionRead>("/api/car-sessions", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export async function updateCarSession(
  id: number,
  payload: CarSessionUpdate
): Promise<void> {
  await api<void>(`/api/car-sessions/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export async function deleteCarSession(id: number): Promise<void> {
  await api<void>(`/api/car-sessions/${id}`, { method: "DELETE" });
}

export function listCarSessionsForCar(teamCarId: number) {
  return api<CarSessionRead[]>(`/api/car-sessions?teamCarId=${teamCarId}`);
}
