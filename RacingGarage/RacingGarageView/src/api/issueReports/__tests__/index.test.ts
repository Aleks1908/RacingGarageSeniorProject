import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listIssueReports,
  getIssueReport,
  createIssueReport,
  updateIssueReport,
  deleteIssueReport,
  listIssues,
  linkIssueToWorkOrder,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  IssueReportRead,
  IssueReportCreate,
  IssueReportUpdate,
  IssueRead,
} from "../types";

describe("issueReports API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listIssueReports", () => {
    it("should fetch all issue reports without filters", async () => {
      const mockReports: IssueReportRead[] = [
        {
          id: 1,
          teamCarId: 1,
          title: "Engine overheating",
          status: "Open",
          severity: "High",
        } as IssueReportRead,
      ];

      mockApiSuccess(mockReports);

      const result = await listIssueReports();

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports");
      expect(result).toEqual(mockReports);
    });

    it("should fetch issue reports with teamCarId filter", async () => {
      mockApiSuccess([]);

      await listIssueReports({ teamCarId: 5 });

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports?teamCarId=5");
    });

    it("should fetch issue reports with multiple filters", async () => {
      mockApiSuccess([]);

      await listIssueReports({
        teamCarId: 5,
        status: "Open",
        severity: "Critical",
        reportedByUserId: 10,
      });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/issue-reports?teamCarId=5&reportedByUserId=10&status=Open&severity=Critical"
      );
    });
  });

  describe("getIssueReport", () => {
    it("should fetch a single issue report by id", async () => {
      const mockReport: IssueReportRead = {
        id: 1,
        teamCarId: 1,
        title: "Engine overheating",
        status: "Open",
      } as IssueReportRead;

      mockApiSuccess(mockReport);

      const result = await getIssueReport(1);

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports/1");
      expect(result).toEqual(mockReport);
    });
  });

  describe("createIssueReport", () => {
    it("should create a new issue report", async () => {
      const createDto: IssueReportCreate = {
        teamCarId: 1,
        carSessionId: null,
        reportedByUserId: 1,
        title: "Brake failure",
        description: "Front brakes not responding properly",
        severity: "Critical",
        status: "Open",
      };

      const mockResponse: IssueReportRead = {
        id: 2,
        ...createDto,
        status: "Open",
      } as IssueReportRead;

      mockApiSuccess(mockResponse);

      const result = await createIssueReport(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateIssueReport", () => {
    it("should update an existing issue report", async () => {
      const updateDto: IssueReportUpdate = {
        teamCarId: 1,
        carSessionId: null,
        linkedWorkOrderId: null,
        title: "Brake failure",
        description: "Front brakes not responding properly",
        severity: "Critical",
        status: "Resolved",
        closedAt: "2024-01-15T10:00:00Z",
      };

      mockApiSuccess(undefined);

      await updateIssueReport(1, updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports/1", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
    });
  });

  describe("deleteIssueReport", () => {
    it("should delete an issue report", async () => {
      mockApiSuccess(undefined);

      await deleteIssueReport(1);

      expect(mockApi).toHaveBeenCalledWith("/api/issue-reports/1", {
        method: "DELETE",
      });
    });
  });

  describe("listIssues", () => {
    it("should fetch all issues without filters", async () => {
      const mockIssues: IssueRead[] = [
        {
          id: 1,
          title: "Engine issue",
        } as IssueRead,
      ];

      mockApiSuccess(mockIssues);

      const result = await listIssues();

      expect(mockApi).toHaveBeenCalledWith("/api/issues", { method: "GET" });
      expect(result).toEqual(mockIssues);
    });

    it("should fetch issues with filters", async () => {
      mockApiSuccess([]);

      await listIssues({ status: "Open", teamCarId: 5 });

      expect(mockApi).toHaveBeenCalledWith(
        "/api/issues?status=Open&teamCarId=5",
        {
          method: "GET",
        }
      );
    });
  });

  describe("linkIssueToWorkOrder", () => {
    it("should link an issue to a work order", async () => {
      mockApiSuccess(undefined);

      await linkIssueToWorkOrder(1, 10);

      expect(mockApi).toHaveBeenCalledWith(
        "/api/issue-reports/1/link-work-order",
        {
          method: "POST",
          body: JSON.stringify({ linkedWorkOrderId: 10 }),
        }
      );
    });

    it("should unlink an issue from a work order", async () => {
      mockApiSuccess(undefined);

      await linkIssueToWorkOrder(1, null);

      expect(mockApi).toHaveBeenCalledWith(
        "/api/issue-reports/1/link-work-order",
        {
          method: "POST",
          body: JSON.stringify({ linkedWorkOrderId: null }),
        }
      );
    });
  });
});
