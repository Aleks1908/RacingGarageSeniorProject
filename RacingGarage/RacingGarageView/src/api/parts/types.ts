export type PartRead = {
  id: number;

  name: string;
  sku: string;
  category: string;

  unitCost: number;
  reorderPoint: number;

  supplierId: number | null;
  supplierName: string | null;

  isActive: boolean;
  createdAt: string;

  currentStock: number | null;
  needsReorder: boolean | null;
};

export type PartCreate = {
  name: string;
  sku: string;
  category: string;

  unitCost: number;
  reorderPoint: number;

  supplierId: number | null;
  isActive?: boolean;
};

export type PartUpdate = {
  name: string;
  sku: string;
  category: string;

  unitCost: number;
  reorderPoint: number;

  supplierId: number | null;
  isActive: boolean;
};
