import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listCarSessions,
  createCarSession,
  updateCarSession,
  deleteCarSession,
  listCarSessionsForCar,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  CarSessionRead,
  CarSessionCreate,
  CarSessionUpdate,
} from "../types";

describe("carSessions API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listCarSessions", () => {
    it("should fetch all car sessions", async () => {
      const mockSessions: CarSessionRead[] = [
        {
          id: 1,
          teamCarId: 1,
          teamCarNumber: "23",
          sessionType: "Practice",
          date: "2026-01-04",
          trackName: "Laguna Seca",
          driverUserId: null,
          driverName: null,
          laps: 15,
          notes: null,
        },
      ];

      mockApiSuccess(mockSessions);

      const result = await listCarSessions();

      expect(mockApi).toHaveBeenCalledWith("/api/car-sessions", {
        method: "GET",
      });
      expect(result).toEqual(mockSessions);
    });
  });

  describe("createCarSession", () => {
    it("should create a new car session", async () => {
      const createDto: CarSessionCreate = {
        teamCarId: 1,
        sessionType: "Qualifying",
        date: "2026-01-05",
        trackName: "Spa-Francorchamps",
        laps: 20,
      };

      const mockResponse: CarSessionRead = {
        id: 2,
        ...createDto,
      } as CarSessionRead;

      mockApiSuccess(mockResponse);

      const result = await createCarSession(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/car-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateCarSession", () => {
    it("should update an existing car session", async () => {
      const updateDto: CarSessionUpdate = {
        teamCarId: 1,
        sessionType: "Race",
        date: "2026-01-05",
        trackName: "Spa-Francorchamps",
        laps: 25,
        notes: "Updated notes",
      };

      mockApiSuccess(undefined);

      await updateCarSession(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/car-sessions/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteCarSession", () => {
    it("should delete a car session", async () => {
      mockApiSuccess(undefined);

      await deleteCarSession(1);

      expect(mockApi).toHaveBeenCalledWith("/api/car-sessions/1", {
        method: "DELETE",
      });
    });
  });

  describe("listCarSessionsForCar", () => {
    it("should fetch car sessions for a specific team car", async () => {
      const mockSessions: CarSessionRead[] = [
        {
          id: 1,
          teamCarId: 5,
          teamCarNumber: "23",
          sessionType: "Practice",
          date: "2026-01-04",
          trackName: "Laguna Seca",
          driverUserId: null,
          driverName: null,
          laps: 15,
          notes: null,
        },
      ];

      mockApiSuccess(mockSessions);

      const result = await listCarSessionsForCar(5);

      expect(mockApi).toHaveBeenCalledWith("/api/car-sessions?teamCarId=5");
      expect(result).toEqual(mockSessions);
    });
  });
});
