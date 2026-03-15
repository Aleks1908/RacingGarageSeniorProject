export type LaborLogRead = {
  id: number;
  workOrderTaskId: number;
  mechanicUserId: number;
  mechanicName: string;
  minutes: number;
  logDate: string;
  comment: string;
};
export type LaborLogCreate = {
  workOrderTaskId: number;
  minutes: number;
  logDate: string;
  comment?: string;
};

export type LaborLogUpdate = {
  minutes: number;
  logDate: string;
  comment?: string;
};

export type ListLaborLogsParams = {
  workOrderTaskId?: number;
};
