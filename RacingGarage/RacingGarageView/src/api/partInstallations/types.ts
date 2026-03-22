export type PartInstallationRead = {
  id: number;
  workOrderId: number;
  partId: number;
  partSku: string;
  partName: string;
  inventoryLocationId: number;
  locationCode: string;
  quantity: number;
  installedByUserId: number;
  installedByName: string | null;
  installedAt: string;
  notes: string;
};

export type PartInstallationCreate = {
  workOrderId: number;
  partId: number;
  inventoryLocationId: number;
  quantity: number;
  notes?: string;
};

export type ListPartInstallationsParams = {
  workOrderId?: number;
};
