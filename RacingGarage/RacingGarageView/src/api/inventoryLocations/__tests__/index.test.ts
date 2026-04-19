import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listInventoryLocations,
  getInventoryLocation,
  createInventoryLocation,
  updateInventoryLocation,
  deleteInventoryLocation,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  InventoryLocationRead,
  InventoryLocationCreate,
  InventoryLocationUpdate,
} from "../types";

describe("inventoryLocations API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listInventoryLocations", () => {
    it("should fetch all inventory locations without filters", async () => {
      const mockLocations: InventoryLocationRead[] = [
        {
          id: 1,
          name: "Main Warehouse",
          description: "Primary storage facility",
          isActive: true,
        } as InventoryLocationRead,
      ];

      mockApiSuccess(mockLocations);

      const result = await listInventoryLocations();

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-locations");
      expect(result).toEqual(mockLocations);
    });

    it("should fetch inventory locations with activeOnly filter", async () => {
      mockApiSuccess([]);

      await listInventoryLocations({ activeOnly: true });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/inventory-locations?activeOnly=true"
      );
    });
  });

  describe("getInventoryLocation", () => {
    it("should fetch a single inventory location by id", async () => {
      const mockLocation: InventoryLocationRead = {
        id: 1,
        name: "Main Warehouse",
        description: "Primary storage facility",
        isActive: true,
      } as InventoryLocationRead;

      mockApiSuccess(mockLocation);

      const result = await getInventoryLocation(1);

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-locations/1");
      expect(result).toEqual(mockLocation);
    });
  });

  describe("createInventoryLocation", () => {
    it("should create a new inventory location", async () => {
      const createDto: InventoryLocationCreate = {
        name: "Secondary Warehouse",
        description: "Overflow storage",
        code: "",
      };

      const mockResponse: InventoryLocationRead = {
        id: 2,
        ...createDto,
        isActive: true,
      } as InventoryLocationRead;

      mockApiSuccess(mockResponse);

      const result = await createInventoryLocation(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-locations", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateInventoryLocation", () => {
    it("should update an existing inventory location", async () => {
      const updateDto: InventoryLocationUpdate = {
        name: "Updated Warehouse Name",
        description: "Updated description",
        code: "",
        isActive: false,
      };

      mockApiSuccess(undefined);

      await updateInventoryLocation(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-locations/1", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteInventoryLocation", () => {
    it("should delete an inventory location", async () => {
      mockApiSuccess(undefined);

      await deleteInventoryLocation(1);

      expect(mockApi).toHaveBeenCalledWith("/api/inventory-locations/1", {
        method: "DELETE",
      });
    });
  });
});
