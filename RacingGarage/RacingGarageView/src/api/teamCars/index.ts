import { api } from "@/api/client/client";
import type {
  TeamCarCreate,
  TeamCarDashboard,
  TeamCarRead,
  TeamCarUpdate,
} from "./types";

export function listTeamCars() {
  return api<TeamCarRead[]>("/api/team-cars");
}

export function getTeamCar(id: number) {
  return api<TeamCarRead>(`/api/team-cars/${id}`);
}

export function createTeamCar(dto: TeamCarCreate) {
  return api<TeamCarRead>("/api/team-cars", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateTeamCar(id: number, dto: TeamCarUpdate) {
  return api<void>(`/api/team-cars/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteTeamCar(id: number) {
  return api<void>(`/api/team-cars/${id}`, { method: "DELETE" });
}

export function getTeamCarDashboard(id: number) {
  return api<TeamCarDashboard>(`/api/team-cars/${id}/dashboard`);
}
