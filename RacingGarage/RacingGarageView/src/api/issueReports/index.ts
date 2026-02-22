import { api } from "../client/client";
import type {
  IssueReportCreate,
  IssueReportListParams,
  IssueReportRead,
  IssueReportUpdate,
} from "./types";

export function listIssueReports(params: IssueReportListParams = {}) {
  const qs = new URLSearchParams();

  if (params.teamCarId) qs.set("teamCarId", String(params.teamCarId));
  if (params.reportedByUserId)
    qs.set("reportedByUserId", String(params.reportedByUserId));
  if (params.status) qs.set("status", params.status);
  if (params.severity) qs.set("severity", params.severity);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<IssueReportRead[]>(`/api/issue-reports${suffix}`);
}

export function getIssueReport(id: number) {
  return api<IssueReportRead>(`/api/issue-reports/${id}`);
}

export function createIssueReport(dto: IssueReportCreate) {
  return api<IssueReportRead>("/api/issue-reports", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateIssueReport(id: number, dto: IssueReportUpdate) {
  return api<void>(`/api/issue-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteIssueReport(id: number) {
  return api<void>(`/api/issue-reports/${id}`, {
    method: "DELETE",
  });
}

export type { IssueReportRead } from "./types";
