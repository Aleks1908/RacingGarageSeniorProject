import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listWorkOrderTasks,
  createWorkOrderTask,
  updateWorkOrderTask,
  deleteWorkOrderTask,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  WorkOrderTaskRead,
  WorkOrderTaskCreate,
  WorkOrderTaskUpdate,
} from "../types";

describe("workOrderTasks API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listWorkOrderTasks", () => {
    it("should fetch all work order tasks without filters", async () => {
      const mockTasks: WorkOrderTaskRead[] = [
        {
          id: 1,
          workOrderId: 5,
          title: "Replace oil filter",
          description: "Install new oil filter",
          status: "NotStarted",
        } as WorkOrderTaskRead,
      ];

      mockApiSuccess(mockTasks);

      const result = await listWorkOrderTasks();

      expect(mockApi).toHaveBeenCalledWith("/api/work-order-tasks");
      expect(result).toEqual(mockTasks);
    });

    it("should fetch work order tasks filtered by workOrderId", async () => {
      mockApiSuccess([]);

      await listWorkOrderTasks({ workOrderId: 10 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/work-order-tasks?workOrderId=10"
      );
    });
  });

  describe("createWorkOrderTask", () => {
    it("should create a new work order task", async () => {
      const createDto: WorkOrderTaskCreate = {
        workOrderId: 5,
        title: "Check tire pressure",
        description: "Verify all tires are at correct PSI",
        sortOrder: 1,
      };

      const mockResponse: WorkOrderTaskRead = {
        id: 2,
        ...createDto,
        status: "NotStarted",
      } as WorkOrderTaskRead;

      mockApiSuccess(mockResponse);

      const result = await createWorkOrderTask(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/work-order-tasks", {
        method: "POST",
        auth: true,
        body: JSON.stringify(createDto),
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateWorkOrderTask", () => {
    it("should update an existing work order task", async () => {
      const updateDto: WorkOrderTaskUpdate = {
        status: "Completed",
        title: "Updated task title",
        sortOrder: 1,
      };

      mockApiSuccess(undefined);

      await updateWorkOrderTask(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/work-order-tasks/1", {
        method: "PUT",
        auth: true,
        body: JSON.stringify(updateDto),
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  describe("deleteWorkOrderTask", () => {
    it("should delete a work order task", async () => {
      mockApiSuccess(undefined);

      await deleteWorkOrderTask(1);

      expect(mockApi).toHaveBeenCalledWith("/api/work-order-tasks/1", {
        method: "DELETE",
        auth: true,
      });
    });
  });
});
