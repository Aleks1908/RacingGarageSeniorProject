import type {
  WorkOrderRead,
  WorkOrderTaskRead,
  LaborLogRead,
  PartInstallationRead,
} from "@/api/shared/types";

export type WorkOrderCreate = {
  teamCarId: number;
  createdByUserId: number;
  assignedToUserId?: number | null;
  carSessionId?: number | null;

  title: string;
  description?: string;

  priority?: string;
  status?: string;

  dueDate?: string | null;
};

export type WorkOrderUpdate = {
  teamCarId: number;
  assignedToUserId?: number | null;
  carSessionId?: number | null;

  title: string;
  description?: string;

  priority?: string;
  status?: string;

  dueDate?: string | null;
  closedAt?: string | null;
};

export type WorkOrderDetails = {
  workOrder: WorkOrderRead;
  tasks: WorkOrderTaskRead[];
  laborLogs: LaborLogRead[];
  partInstallations: PartInstallationRead[];
  totalLaborMinutes: number;
  totalInstalledPartsQty: number;
};
