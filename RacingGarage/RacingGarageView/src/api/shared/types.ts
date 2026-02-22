export type WorkOrderRead = {
  id: number;
  teamCarId: number;
  teamCarNumber: string;

  createdByUserId: number;
  createdByName: string;

  assignedToUserId: number | null;
  assignedToName: string | null;

  carSessionId: number | null;

  title: string;
  description: string;

  priority: string;
  status: string;

  createdAt: string;
  dueDate: string | null;
  closedAt: string | null;
};

export type CarSessionRead = {
  id: number;
  teamCarId: number;
  teamCarNumber: string;
  sessionType: string;
  date: string;
  trackName: string;
  driverUserId: number | null;
  driverName: string | null;
  laps: number;
  notes: string;
};

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

export type WorkOrderTaskRead = {
  id: number;
  workOrderId: number;
  title: string;
  description: string;
  status: string;
  sortOrder: number;
  estimatedMinutes: number | null;
  completedAt: string | null;
};

export type LaborLogRead = {
  id: number;
  workOrderTaskId: number;
  mechanicUserId: number;
  mechanicName: string;
  minutes: number;
  logDate: string;
  comment: string;
};

export type PartInstallationRead = {
  id: number;
  workOrderId: number;
  partId: number;
  partSku: string;
  partName: string;
  inventoryLocationId: number;
  locationCode: string;
  quantity: number;
  installedByUserId: number | null;
  installedByName: string | null;
  installedAt: string;
  notes: string;
};
