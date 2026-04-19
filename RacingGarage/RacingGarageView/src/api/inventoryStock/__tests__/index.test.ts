import { describe, it, expect, beforeEach } from "@jest/globals";
import { listInventoryStock, adjustInventoryStock } from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { InventoryStockRead, InventoryStockAdjustRequest } from "../types";

describe("inventoryStock API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listInventoryStock", () => {
    it("should fetch all inventory stock without filters", async () => {
      const mockStock: InventoryStockRead[] = [
        {
          id: 1,
          partId: 10,
          partName: "Brake Pad",
          partSku: "BRK-001",
          inventoryLocationId: 5,
          locationCode: "WH-001",
          quantity: 50,
          updatedAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockApiSuccess(mockStock);

      const result = await listInventoryStock();

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-stock");
      expect(result).toEqual(mockStock);
    });

    it("should fetch inventory stock filtered by partId", async () => {
      mockApiSuccess([]);

      await listInventoryStock({ partId: 10 });

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-stock?partId=10");
    });

    it("should fetch inventory stock filtered by locationId", async () => {
      mockApiSuccess([]);

      await listInventoryStock({ locationId: 5 });

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-stock?locationId=5");
    });

    it("should fetch inventory stock with multiple filters", async () => {
      mockApiSuccess([]);

      await listInventoryStock({ partId: 10, locationId: 5 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-stock?partId=10&locationId=5"
      );
    });
  });

  describe("adjustInventoryStock", () => {
    it("should adjust inventory stock", async () => {
      const adjustDto: InventoryStockAdjustRequest = {
        partId: 10,
        inventoryLocationId: 5,
        quantityChange: 10,
        reason: "Restock",
      };

      const mockResponse: InventoryStockRead = {
        id: 1,
        partId: 10,
        partName: "Brake Pad",
        partSku: "BRK-001",
        inventoryLocationId: 5,
        locationCode: "WH-001",
        quantity: 60,
        updatedAt: "2024-01-15T10:00:00Z",
      };

      mockApiSuccess(mockResponse);

      const result = await adjustInventoryStock(adjustDto);

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-stock/adjust", {
        method: "POST",
        body: JSON.stringify(adjustDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
