import { describe, it, expect, beforeEach } from "@jest/globals";
import { listInventoryMovements } from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { InventoryMovementRead } from "../types";

describe("inventoryMovements API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listInventoryMovements", () => {
    it("should fetch all inventory movements without filters", async () => {
      const mockMovements: InventoryMovementRead[] = [
        {
          id: 1,
          partId: 10,
          locationId: 5,
          partName: "Brake Pad",
          locationName: "Main Warehouse",
          quantityChange: -5,
          reason: "Used in work order",
          workOrderId: 15,
        } as unknown as InventoryMovementRead,
      ];

      mockApiSuccess(mockMovements);

      const result = await listInventoryMovements();

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-movements");
      expect(result).toEqual(mockMovements);
    });

    it("should fetch inventory movements filtered by partId", async () => {
      mockApiSuccess([]);

      await listInventoryMovements({ partId: 10 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-movements?partId=10"
      );
    });

    it("should fetch inventory movements filtered by locationId", async () => {
      mockApiSuccess([]);

      await listInventoryMovements({ locationId: 5 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-movements?locationId=5"
      );
    });

    it("should fetch inventory movements filtered by workOrderId", async () => {
      mockApiSuccess([]);

      await listInventoryMovements({ workOrderId: 15 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-movements?workOrderId=15"
      );
    });

    it("should fetch inventory movements filtered by reason", async () => {
      mockApiSuccess([]);

      await listInventoryMovements({ reason: "Restock" });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-movements?reason=Restock"
      );
    });

    it("should fetch inventory movements with multiple filters", async () => {
      mockApiSuccess([]);

      await listInventoryMovements({
        partId: 10,
        locationId: 5,
        workOrderId: 15,
        reason: "Used",
      });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-movements?partId=10&locationId=5&workOrderId=15&reason=Used"
      );
    });
  });
});
