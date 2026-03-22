export type InventoryMovementRead = {
  id: number;
  partId: number;
  partSku: string;
  partName: string;
  inventoryLocationId: number;
  locationCode: string;
  quantityChange: number;
  reason: string;
  workOrderId: number | null;
  performedByUserId: number | null;
  performedByName: string | null;
  performedAt: string;
  notes: string;
};
