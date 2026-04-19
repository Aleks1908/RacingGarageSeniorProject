import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { PartRead, PartCreate, PartUpdate } from "../types";

describe("parts API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listParts", () => {
    it("should fetch all parts without filters", async () => {
      const mockParts: PartRead[] = [
        {
          id: 1,
          name: "Brake Pad",
          sku: "PART-001",
          category: "Brakes",
          unitCost: 50.0,
          reorderPoint: 10,
          supplierId: 1,
          supplierName: "Supplier A",
          isActive: true,
          createdAt: "2024-01-01T00:00:00Z",
          currentStock: 25,
          needsReorder: false,
        },
      ];

      mockApiSuccess(mockParts);

      const result = await listParts();

      expect(mockApi).toHaveBeenCalledWith("/api/parts");
      expect(result).toEqual(mockParts);
    });

    it("should fetch parts with activeOnly filter", async () => {
      mockApiSuccess([]);

      await listParts({ activeOnly: true });

      expect(mockApi).toHaveBeenCalledWith("/api/parts?activeOnly=true");
    });

    it("should fetch parts with search query", async () => {
      mockApiSuccess([]);

      await listParts({ q: "brake" });

      expect(mockApi).toHaveBeenCalledWith("/api/parts?q=brake");
    });

    it("should fetch parts with multiple filters", async () => {
      mockApiSuccess([]);

      await listParts({ activeOnly: true, q: "brake" });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/parts?activeOnly=true&q=brake"
      );
    });
  });

  describe("getPart", () => {
    it("should fetch a single part by id", async () => {
      const mockPart: PartRead = {
        id: 1,
        name: "Brake Pad",
        sku: "PART-001",
        category: "Brakes",
        unitCost: 50.0,
        reorderPoint: 10,
        supplierId: 1,
        supplierName: "Supplier A",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        currentStock: 25,
        needsReorder: false,
      };

      mockApiSuccess(mockPart);

      const result = await getPart(1);

      expect(mockApi).toHaveBeenCalledWith("/api/parts/1");
      expect(result).toEqual(mockPart);
    });
  });

  describe("createPart", () => {
    it("should create a new part", async () => {
      const createDto: PartCreate = {
        name: "Oil Filter",
        sku: "PART-002",
        category: "Engine",
        unitCost: 25.0,
        reorderPoint: 5,
        supplierId: 1,
      };

      const mockResponse: PartRead = {
        id: 2,
        ...createDto,
        supplierName: "Supplier A",
        isActive: true,
      } as PartRead;

      mockApiSuccess(mockResponse);

      const result = await createPart(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/parts", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updatePart", () => {
    it("should update an existing part", async () => {
      const updateDto: PartUpdate = {
        name: "Updated Brake Pad",
        sku: "PART-001",
        category: "Brakes",
        unitCost: 55.0,
        reorderPoint: 10,
        supplierId: 1,
        isActive: true,
      };

      mockApiSuccess(undefined);

      await updatePart(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/parts/1", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deletePart", () => {
    it("should delete a part", async () => {
      mockApiSuccess(undefined);

      await deletePart(1);

      expect(mockApi).toHaveBeenCalledWith("/api/parts/1", {
        method: "DELETE",
      });
    });
  });
});
