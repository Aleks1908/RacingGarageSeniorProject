import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getWorkOrderDetails,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { WorkOrderRead } from "@/api/shared/types";
import type {
  WorkOrderCreate,
  WorkOrderUpdate,
  WorkOrderDetails,
} from "../types";

describe("workOrders API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listWorkOrders", () => {
    it("should fetch all work orders without filters", async () => {
      const mockOrders: WorkOrderRead[] = [
        {
          id: 1,
          teamCarId: 1,
          title: "Engine maintenance",
          status: "Open",
          priority: "High",
        } as WorkOrderRead,
      ];

      mockApiSuccess(mockOrders);

      const result = await listWorkOrders();

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders");
      expect(result).toEqual(mockOrders);
    });

    it("should fetch work orders with teamCarId filter", async () => {
      mockApiSuccess([]);

      await listWorkOrders({ teamCarId: 5 });

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders?teamCarId=5");
    });

    it("should fetch work orders with status filter", async () => {
      mockApiSuccess([]);

      await listWorkOrders({ status: "InProgress" });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/work-orders?status=InProgress",
      );
    });

    it("should fetch work orders with priority filter", async () => {
      mockApiSuccess([]);

      await listWorkOrders({ priority: "Critical" });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/work-orders?priority=Critical",
      );
    });

    it("should fetch work orders with multiple filters", async () => {
      mockApiSuccess([]);

      await listWorkOrders({
        teamCarId: 5,
        status: "Open",
        priority: "High",
      });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/work-orders?teamCarId=5&status=Open&priority=High",
      );
    });
  });

  describe("createWorkOrder", () => {
    it("should create a new work order", async () => {
      const createDto: WorkOrderCreate = {
        teamCarId: 1,
        createdByUserId: 1,
        title: "Brake replacement",
        description: "Replace front brake pads",
        priority: "High",
      };

      const mockResponse: WorkOrderRead = {
        id: 10,
        ...createDto,
        status: "Open",
      } as WorkOrderRead;

      mockApiSuccess(mockResponse);

      const result = await createWorkOrder(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateWorkOrder", () => {
    it("should update an existing work order", async () => {
      const updateDto: WorkOrderUpdate = {
        teamCarId: 1,
        title: "Brake replacement",
        status: "Completed",
        priority: "Low",
      };

      mockApiSuccess(undefined);

      await updateWorkOrder(10, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders/10", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteWorkOrder", () => {
    it("should delete a work order", async () => {
      mockApiSuccess(undefined);

      await deleteWorkOrder(10);

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders/10", {
        method: "DELETE",
      });
    });
  });

  describe("getWorkOrderDetails", () => {
    it("should fetch work order details", async () => {
      const mockDetails: WorkOrderDetails = {
        workOrder: {} as WorkOrderRead,
        tasks: [],
        laborLogs: [],
        partInstallations: [],
        totalLaborMinutes: 0,
        totalInstalledPartsQty: 0,
        linkedIssue: null,
      };

      mockApiSuccess(mockDetails);

      const result = await getWorkOrderDetails(10);

      expect(mockApi).toHaveBeenCalledWith("/api/work-orders/10/details");
      expect(result).toEqual(mockDetails);
    });
  });
});
