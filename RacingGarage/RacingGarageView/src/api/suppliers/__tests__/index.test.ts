import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { SupplierRead, SupplierCreate, SupplierUpdate } from "../types";

describe("suppliers API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listSuppliers", () => {
    it("should fetch all suppliers without filters", async () => {
      const mockSuppliers: SupplierRead[] = [
        {
          id: 1,
          name: "Acme Parts Co.",
          contactEmail: "john@acme.com",
          phone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          country: null,
          isActive: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockApiSuccess(mockSuppliers);

      const result = await listSuppliers();

      expect(mockApi).toHaveBeenCalledWith("/api/suppliers");
      expect(result).toEqual(mockSuppliers);
    });

    it("should fetch suppliers with activeOnly filter", async () => {
      mockApiSuccess([]);

      await listSuppliers({ activeOnly: true });

      expect(mockApi).toHaveBeenCalledWith("/api/suppliers?activeOnly=true");
    });
  });

  describe("createSupplier", () => {
    it("should create a new supplier", async () => {
      const createDto: SupplierCreate = {
        name: "New Supplier Inc.",
        contactEmail: "contact@newsupplier.com",
        phone: "555-1234",
      };

      const mockResponse: SupplierRead = {
        id: 2,
        ...createDto,
        isActive: true,
      } as SupplierRead;

      mockApiSuccess(mockResponse);

      const result = await createSupplier(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateSupplier", () => {
    it("should update an existing supplier", async () => {
      const updateDto: SupplierUpdate = {
        name: "Updated Supplier Name",
        phone: "555-9999",
        isActive: true,
      };

      mockApiSuccess(undefined);

      await updateSupplier(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/suppliers/1", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteSupplier", () => {
    it("should delete a supplier", async () => {
      mockApiSuccess(undefined);

      await deleteSupplier(1);

      expect(mockApi).toHaveBeenCalledWith("/api/suppliers/1", {
        method: "DELETE",
      });
    });
  });
});
