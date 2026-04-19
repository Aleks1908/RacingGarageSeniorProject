import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listTeamCars,
  getTeamCar,
  createTeamCar,
  updateTeamCar,
  deleteTeamCar,
  getTeamCarDashboard,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  TeamCarRead,
  TeamCarCreate,
  TeamCarUpdate,
  TeamCarDashboard,
} from "../types";

describe("teamCars API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listTeamCars", () => {
    it("should fetch all team cars", async () => {
      const mockCars: TeamCarRead[] = [
        {
          id: 1,
          carNumber: "23",
          make: "Ferrari",
          model: "488",
          year: 2023,
        } as TeamCarRead,
      ];

      mockApiSuccess(mockCars);

      const result = await listTeamCars();

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars");
      expect(result).toEqual(mockCars);
    });
  });

  describe("getTeamCar", () => {
    it("should fetch a single team car by id", async () => {
      const mockCar: TeamCarRead = {
        id: 1,
        carNumber: "23",
        make: "Ferrari",
        model: "488",
        year: 2023,
      } as TeamCarRead;

      mockApiSuccess(mockCar);

      const result = await getTeamCar(1);

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars/1");
      expect(result).toEqual(mockCar);
    });
  });

  describe("createTeamCar", () => {
    it("should create a new team car", async () => {
      const createDto: TeamCarCreate = {
        carNumber: "45",
        nickname: "Porsche GT3",
        make: "Porsche",
        model: "911 GT3",
        year: 2024,
        carClass: "GT3",
        odometerKm: 0,
      };

      const mockResponse: TeamCarRead = {
        id: 2,
        ...createDto,
      } as TeamCarRead;

      mockApiSuccess(mockResponse);

      const result = await createTeamCar(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateTeamCar", () => {
    it("should update an existing team car", async () => {
      const updateDto: TeamCarUpdate = {
        carNumber: "46",
        nickname: "Updated Car",
        make: "Porsche",
        model: "911 GT3",
        year: 2024,
        carClass: "GT3",
        odometerKm: 1000,
      };

      mockApiSuccess(undefined);

      await updateTeamCar(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars/1", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteTeamCar", () => {
    it("should delete a team car", async () => {
      mockApiSuccess(undefined);

      await deleteTeamCar(1);

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars/1", {
        method: "DELETE",
      });
    });
  });

  describe("getTeamCarDashboard", () => {
    it("should fetch team car dashboard data", async () => {
      const mockDashboard: TeamCarDashboard = {
        car: {
          id: 1,
          carNumber: "23",
          make: "Ferrari",
          model: "488",
          year: 2023,
          status: "Active",
          nickname: "Red",
          carClass: "GT3",
          odometerKm: 12000,
        },
        latestSession: null,
        openIssues: [],
        openWorkOrders: [],
      };

      mockApiSuccess(mockDashboard);

      const result = await getTeamCarDashboard(1);

      expect(mockApi).toHaveBeenCalledWith("/api/team-cars/1/dashboard");
      expect(result).toEqual(mockDashboard);
    });
  });
});
