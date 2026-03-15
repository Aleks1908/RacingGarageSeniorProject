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

export type WorkOrderTaskCreate = {
  workOrderId: number;
  title: string;
  description?: string;
  status?: string;
  sortOrder: number;
  estimatedMinutes?: number | null;
};

export type WorkOrderTaskUpdate = {
  title: string;
  description?: string;
  status?: string;
  sortOrder: number;
  estimatedMinutes?: number | null;
  completedAt?: string | null;
};

export type ListWorkOrderTasksParams = {
  workOrderId?: number;
};
