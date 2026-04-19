import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { IssueReportsPage } from "../IssueReportsPage";
import { createMockJwt } from "@/test-utils";
import * as issuesApi from "@/api/issueReports";
import * as carsApi from "@/api/teamCars";
import type { IssueReportRead } from "@/api/issueReports/types";
import type { TeamCarRead } from "@/api/teamCars/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/issueReports");
jest.mock("@/api/teamCars");
jest.mock(
  "@/components/IssueReportUpsertDialog/IssueReportUpsertDialog",
  () => ({
    IssueReportUpsertDialog: ({
      onSaved,
      onOpenChange,
    }: {
      onSaved: () => void;
      onOpenChange: (open: boolean) => void;
    }) => (
      <div data-testid="issue-dialog">
        <button onClick={onSaved}>Save Issue</button>
        <button onClick={() => onOpenChange(false)}>Close Issue</button>
      </div>
    ),
  }),
);

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListIssueReports = issuesApi.listIssueReports as jest.MockedFunction<
  typeof issuesApi.listIssueReports
>;
const mockDeleteIssueReport =
  issuesApi.deleteIssueReport as jest.MockedFunction<
    typeof issuesApi.deleteIssueReport
  >;
const mockListTeamCars = carsApi.listTeamCars as jest.MockedFunction<
  typeof carsApi.listTeamCars
>;

const mockIssues: IssueReportRead[] = [
  {
    id: 1,
    title: "Brake noise",
    description: "Grinding sound when braking",
    teamCarId: 1,
    teamCarNumber: "42",
    carSessionId: 10,
    severity: "High",
    status: "Open",
    reportedAt: "2024-02-01T10:00:00Z",
    reportedByUserId: 5,
    reportedByName: "John Driver",
    linkedWorkOrderId: null,
    closedAt: null,
  },
  {
    id: 2,
    title: "Oil leak",
    description: "",
    teamCarId: 2,
    teamCarNumber: "7",
    carSessionId: null,
    severity: "Medium",
    status: "Closed",
    reportedAt: "2024-02-02T11:00:00Z",
    reportedByUserId: 6,
    reportedByName: "Jane Driver",
    linkedWorkOrderId: 20,
    closedAt: "2024-02-03T15:00:00Z",
  },
];

const mockCars: TeamCarRead[] = [
  {
    id: 1,
    carNumber: "42",
    nickname: "Red",
    make: "Ferrari",
    model: "488 GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 5000,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    carNumber: "7",
    nickname: "Silver",
    make: "McLaren",
    model: "720S GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 3000,
    createdAt: "2024-01-02T00:00:00Z",
  },
];

function renderWithProviders(userOverride?: TestUser) {
  const defaultUser: TestUser = {
    userId: 1,
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    roles: ["Manager"],
    expiresAtUtc: "2026-12-31T23:59:59Z",
  };

  localStorage.clear();
  localStorage.setItem("accessToken", createMockJwt("Test User"));
  localStorage.setItem("user", JSON.stringify(userOverride || defaultUser));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <IssueReportsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("IssueReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListIssueReports.mockResolvedValue(mockIssues);
    mockListTeamCars.mockResolvedValue(mockCars);
    mockDeleteIssueReport.mockResolvedValue();
    mockNavigate.mockClear();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  it("loads issues and cars on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalledWith({
        teamCarId: undefined,
        status: undefined,
        severity: undefined,
      });
      expect(mockListTeamCars).toHaveBeenCalled();
      expect(screen.getByText("Brake noise")).toBeInTheDocument();
      expect(screen.getByText("Oil leak")).toBeInTheDocument();
    });
  });

  it("shows issue count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("2 issues")).toBeInTheDocument();
    });
  });

  it("shows empty state when no issues", async () => {
    mockListIssueReports.mockResolvedValueOnce([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("0 issues")).toBeInTheDocument();
      expect(screen.getByText("No issues found.")).toBeInTheDocument();
    });
  });

  it("handles error when load fails", async () => {
    mockListIssueReports.mockRejectedValueOnce(new Error("Network error"));
    renderWithProviders();

    expect(screen.getByText("Issue Reports")).toBeInTheDocument();
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    fireEvent.click(screen.getByText("Back"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("displays null description as dash", async () => {
    renderWithProviders();
    await screen.findByText("Oil leak");

    const rows = screen.getAllByText("—");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("refreshes data when Refresh button clicked", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    mockListIssueReports.mockClear();
    mockListTeamCars.mockClear();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalled();
      expect(mockListTeamCars).toHaveBeenCalled();
    });
  });

  it("opens create dialog when New Issue clicked", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /new issue/i }));

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();
  });

  it("opens edit dialog when Edit button clicked", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    const editButtons = screen.getAllByRole("button", { name: "" });
    const editButton = editButtons.find((btn) =>
      btn.querySelector('[class*="lucide-pencil"]'),
    );

    await user.click(editButton!);

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();
  });

  it("calls load when dialog saved", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    mockListIssueReports.mockClear();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /new issue/i }));
    await user.click(screen.getByText("Save Issue"));

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalled();
    });
  });

  it("closes dialog when Close Issue clicked", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /new issue/i }));

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Close Issue"));

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();
  });

  it("deletes issue when confirmed", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector('[class*="lucide-trash"]'),
    );

    await user.click(deleteButton!);

    await waitFor(() => {
      expect(mockDeleteIssueReport).toHaveBeenCalledWith(1);
      expect(mockListIssueReports).toHaveBeenCalled();
    });
  });

  it("does not delete when not confirmed", async () => {
    window.confirm = jest.fn(() => false);

    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector('[class*="lucide-trash"]'),
    );

    await user.click(deleteButton!);

    expect(mockDeleteIssueReport).not.toHaveBeenCalled();
  });

  it("shows alert on delete error", async () => {
    mockDeleteIssueReport.mockRejectedValueOnce(new Error("Delete failed"));

    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector('[class*="lucide-trash"]'),
    );

    await user.click(deleteButton!);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("shows generic alert on non-Error delete failure", async () => {
    mockDeleteIssueReport.mockRejectedValueOnce("String error");

    renderWithProviders();
    await screen.findByText("Brake noise");

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector('[class*="lucide-trash"]'),
    );

    await user.click(deleteButton!);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("hides New Issue button for non-Driver/non-Manager", async () => {
    renderWithProviders({
      userId: 1,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake noise");

    expect(
      screen.queryByRole("button", { name: /new issue/i }),
    ).not.toBeInTheDocument();
  });

  it("shows New Issue button for Driver", async () => {
    renderWithProviders({
      userId: 1,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake noise");

    expect(
      screen.getByRole("button", { name: /new issue/i }),
    ).toBeInTheDocument();
  });

  it("disables Edit and Delete buttons for non-Manager", async () => {
    renderWithProviders({
      userId: 1,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake noise");

    const buttons = screen.getAllByRole("button", { name: "" });
    const editButton = buttons.find((btn) =>
      btn.querySelector('[class*="lucide-pencil"]'),
    );
    const deleteButton = buttons.find((btn) =>
      btn.querySelector('[class*="lucide-trash"]'),
    );

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it("renders dialog when user exists", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();
  });

  it("displays all issue fields correctly", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    expect(screen.getByText("Brake noise")).toBeInTheDocument();
    expect(screen.getByText("Grinding sound when braking")).toBeInTheDocument();
    expect(screen.getByText("by John Driver")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Session #10")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("applies car filter correctly", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    mockListIssueReports.mockClear();
    mockListIssueReports.mockResolvedValueOnce([mockIssues[0]]);

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByText("#42 — Ferrari 488 GT3"));

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalledWith({
        teamCarId: 1,
        status: undefined,
        severity: undefined,
      });
    });
  });

  it("applies status filter correctly", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    mockListIssueReports.mockClear();
    mockListIssueReports.mockResolvedValueOnce([mockIssues[0]]);

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getAllByText("Open")[1]);

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalledWith({
        teamCarId: undefined,
        status: "Open",
        severity: undefined,
      });
    });
  });

  it("applies severity filter correctly", async () => {
    renderWithProviders();
    await screen.findByText("Brake noise");

    mockListIssueReports.mockClear();
    mockListIssueReports.mockResolvedValueOnce([mockIssues[0]]);

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("combobox")[2]);
    await user.click(screen.getAllByText("High")[1]);

    await waitFor(() => {
      expect(mockListIssueReports).toHaveBeenCalledWith({
        teamCarId: undefined,
        status: undefined,
        severity: "High",
      });
    });
  });

  it("does not render dialog for non-authorized users", async () => {
    renderWithProviders({
      userId: 1,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@test.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake noise");

    expect(screen.queryByTestId("issue-dialog")).not.toBeInTheDocument();
  });
});
