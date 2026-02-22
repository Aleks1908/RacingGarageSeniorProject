export type IssueReportRead = {
  id: number;

  teamCarId: number;
  teamCarNumber: string;

  carSessionId: number | null;

  reportedByUserId: number;
  reportedByName: string;

  linkedWorkOrderId: number | null;

  title: string;
  description: string;

  severity: string;
  status: string;

  reportedAt: string;
  closedAt: string | null;
};

export type IssueReportCreate = {
  teamCarId: number;
  carSessionId: number | null;
  reportedByUserId: number;

  title: string;
  description: string;

  severity: string;
  status: string;
};

export type IssueReportUpdate = {
  teamCarId: number;
  carSessionId: number | null;
  linkedWorkOrderId: number | null;

  title: string;
  description: string;

  severity: string;
  status: string;

  closedAt: string | null;
};

export type IssueReportListParams = {
  teamCarId?: number;
  reportedByUserId?: number;
  status?: string;
  severity?: string;
};
