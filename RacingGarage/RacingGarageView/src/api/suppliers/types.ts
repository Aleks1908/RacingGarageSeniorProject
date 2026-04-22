export type SupplierRead = {
  id: number;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type SupplierCreate = {
  name: string;
  contactEmail?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
};

export type SupplierUpdate = {
  name: string;
  contactEmail?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  isActive: boolean;
};
