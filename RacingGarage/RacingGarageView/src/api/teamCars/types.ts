import type {
  CarSessionRead,
  IssueReportRead,
  WorkOrderRead,
} from "@/api/shared/types";

export type TeamCarRead = {
  id: number;
  carNumber: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
  carClass: string;
  status: string;
  odometerKm: number;
  createdAt: string;
};

export type TeamCarCreate = {
  carNumber: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
  carClass: string;
  status?: string;
  odometerKm: number;
};

export type TeamCarUpdate = TeamCarCreate;

export type TeamCarSummary = {
  id: number;
  carNumber: string;
  make: string;
  model: string;
  year: number;
  status: string;
};

export type TeamCarDashboard = {
  car: TeamCarSummary;
  latestSession: CarSessionRead | null;
  openIssues: IssueReportRead[];
  openWorkOrders: WorkOrderRead[];
};
