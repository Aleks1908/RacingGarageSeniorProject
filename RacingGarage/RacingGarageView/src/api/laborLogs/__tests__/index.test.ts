import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listLaborLogs,
  createLaborLog,
  updateLaborLog,
  deleteLaborLog,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type { LaborLogRead, LaborLogCreate, LaborLogUpdate } from "../types";

describe("laborLogs API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listLaborLogs", () => {
    it("should fetch all labor logs without filters", async () => {
      const mockLogs: LaborLogRead[] = [
        {
          id: 1,
          workOrderTaskId: 5,
          mechanicUserId: 2,
          mechanicName: "John Mechanic",
          minutes: 210,
          logDate: "2024-01-15",
          comment: "Replaced brake pads",
        },
      ];

      mockApiSuccess(mockLogs);

      const result = await listLaborLogs();

      expect(mockApi).toHaveBeenCalledWith("/api/labor-logs");
      expect(result).toEqual(mockLogs);
    });

    it("should fetch labor logs filtered by workOrderTaskId", async () => {
      mockApiSuccess([]);

      await listLaborLogs({ workOrderTaskId: 10 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/labor-logs?workOrderTaskId=10"
      );
    });
  });

  describe("createLaborLog", () => {
    it("should create a new labor log", async () => {
      const createDto: LaborLogCreate = {
        workOrderTaskId: 5,
        minutes: 120,
        logDate: "2024-01-15",
        comment: "Performed oil change",
      };

      const mockResponse: LaborLogRead = {
        id: 2,
        workOrderTaskId: 5,
        minutes: 120,
        logDate: "2024-01-15",
        comment: "Performed oil change",
        mechanicUserId: 1,
        mechanicName: "Jane Mechanic",
      };

      mockApiSuccess(mockResponse);

      const result = await createLaborLog(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/labor-logs", {
        method: "POST",
        auth: true,
        body: JSON.stringify(createDto),
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateLaborLog", () => {
    it("should update an existing labor log", async () => {
      const updateDto: LaborLogUpdate = {
        minutes: 240,
        logDate: "2024-01-15",
        comment: "Updated work description",
      };

      mockApiSuccess(undefined);

      await updateLaborLog(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/labor-logs/1", {
        method: "PUT",
        auth: true,
        body: JSON.stringify(updateDto),
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  describe("deleteLaborLog", () => {
    it("should delete a labor log", async () => {
      mockApiSuccess(undefined);

      await deleteLaborLog(1);

      expect(mockApi).toHaveBeenCalledWith("/api/labor-logs/1", {
        method: "DELETE",
        auth: true,
      });
    });
  });
});
