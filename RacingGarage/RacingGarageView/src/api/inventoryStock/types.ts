export type InventoryStockRead = {
  id: number;
  partId: number;
  partName: string;
  partSku: string;
  inventoryLocationId: number;
  locationCode: string;
  quantity: number;
  updatedAt: string;
};

export type InventoryStockAdjustRequest = {
  partId: number;
  inventoryLocationId: number;
  quantityChange: number;
  reason?: string | null;
  workOrderId?: number | null;
  notes?: string | null;
};
