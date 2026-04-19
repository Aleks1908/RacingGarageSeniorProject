import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listPartInstallations,
  createPartInstallation,
  deletePartInstallation,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { PartInstallationRead, PartInstallationCreate } from "../types";

describe("partInstallations API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listPartInstallations", () => {
    it("should fetch all part installations without filters", async () => {
      const mockInstallations: PartInstallationRead[] = [
        {
          id: 1,
          workOrderId: 5,
          partId: 10,
          partSku: "BRK-001",
          partName: "Brake Pad",
          inventoryLocationId: 1,
          locationCode: "WH-001",
          quantity: 2,
          installedByUserId: 1,
          installedByName: "John Mechanic",
          installedAt: "2024-01-15T10:00:00Z",
          notes: "Installed during brake service",
        },
      ];

      mockApiSuccess(mockInstallations);

      const result = await listPartInstallations();

      expect(mockApi).toHaveBeenCalledWith("/api/part-installations");
      expect(result).toEqual(mockInstallations);
    });

    it("should fetch part installations filtered by workOrderId", async () => {
      mockApiSuccess([]);

      await listPartInstallations({ workOrderId: 15 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/part-installations?workOrderId=15"
      );
    });
  });

  describe("createPartInstallation", () => {
    it("should create a new part installation", async () => {
      const createDto: PartInstallationCreate = {
        workOrderId: 5,
        partId: 10,
        inventoryLocationId: 1,
        quantity: 4,
        notes: "Oil filter installation",
      };

      const mockResponse: PartInstallationRead = {
        id: 2,
        ...createDto,
        partName: "Oil Filter",
      } as PartInstallationRead;

      mockApiSuccess(mockResponse);

      const result = await createPartInstallation(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/part-installations", {
        method: "POST",
        auth: true,
        body: JSON.stringify(createDto),
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deletePartInstallation", () => {
    it("should delete a part installation", async () => {
      mockApiSuccess(undefined);

      await deletePartInstallation(1);

      expect(mockApi).toHaveBeenCalledWith("/api/part-installations/1", {
        method: "DELETE",
        auth: true,
      });
    });

    it("should throw error for invalid installation id", () => {
      expect(() => deletePartInstallation(0)).toThrow(
        "Invalid installation id."
      );
      expect(() => deletePartInstallation(-1)).toThrow(
        "Invalid installation id."
      );
      expect(() => deletePartInstallation(NaN)).toThrow(
        "Invalid installation id."
      );
    });
  });
});
