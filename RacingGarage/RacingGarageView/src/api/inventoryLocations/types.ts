export type InventoryLocationRead = {
  id: number;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

export type InventoryLocationCreate = {
  name: string;
  code: string;
  description?: string;
};

export type InventoryLocationUpdate = {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
};

export type ListInventoryLocationsParams = {
  activeOnly?: boolean;
};