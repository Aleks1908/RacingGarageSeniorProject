import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import TeamCarPage from "../TeamCarPage";
import { createMockJwt } from "@/test-utils";
import * as teamCarsApi from "@/api/teamCars";
import * as usersApi from "@/api/users";
import * as carSessionsApi from "@/api/carSessions";
import type { TeamCarDashboard } from "@/api/teamCars/types";
import type { UserRead } from "@/api/users/types";
import type { CarSessionRead } from "@/api/carSessions/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/teamCars");
jest.mock("@/api/users");
jest.mock("@/api/carSessions");
jest.mock("@/components/TeamCarUpsertDialog/TeamCarUpsertDialog", () => ({
  TeamCarUpsertDialog: ({
    onSaved,
    onOpenChange,
  }: {
    onSaved: () => void;
    onOpenChange: (v: boolean) => void;
  }) => (
    <div data-testid="team-car-dialog">
      <button onClick={onSaved}>Save Car</button>
      <button onClick={() => onOpenChange(false)}>Close Car</button>
    </div>
  ),
}));
jest.mock("@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog", () => ({
  WorkOrderUpsertDialog: ({ onSaved }: { onSaved: () => void }) => (
    <div data-testid="work-order-dialog">
      <button onClick={onSaved}>Save WO</button>
    </div>
  ),
}));
jest.mock(
  "@/components/IssueReportUpsertDialog/IssueReportUpsertDialog",
  () => ({
    IssueReportUpsertDialog: ({ onSaved }: { onSaved: () => void }) => (
      <div data-testid="issue-dialog">
        <button onClick={onSaved}>Save Issue</button>
      </div>
    ),
  }),
);
jest.mock("@/components/CarSessionUpsertDialog/CarSessionUpsertDialog", () => ({
  CarSessionUpsertDialog: ({
    onSaved,
    onOpenChange,
  }: {
    onSaved: () => void;
    onOpenChange: (v: boolean) => void;
  }) => (
    <div data-testid="session-dialog">
      <button onClick={onSaved}>Save Session</button>
      <button onClick={() => onOpenChange(false)}>Close Session</button>
    </div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockGetTeamCarDashboard =
  teamCarsApi.getTeamCarDashboard as jest.MockedFunction<
    typeof teamCarsApi.getTeamCarDashboard
  >;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<
  typeof usersApi.listUsers
>;
const mockListCarSessions =
  carSessionsApi.listCarSessions as jest.MockedFunction<
    typeof carSessionsApi.listCarSessions
  >;

const mockDashboard: TeamCarDashboard = {
  car: {
    id: 1,
    carNumber: "42",
    make: "Porsche",
    model: "911 GT3",
    year: 2023,
    status: "Active",
    nickname: "Silver Bullet",
    carClass: "GT3",
    odometerKm: 15000,
  },
  latestSession: {
    id: 10,
    sessionType: "Race",
    trackName: "Spa-Francorchamps",
    date: "2024-12-15",
    laps: 25,
    driverName: "John Driver",
    teamCarId: 1,
    teamCarNumber: "42",
    driverUserId: 5,
    notes: "Great session",
  },
  openIssues: [
    {
      id: 1,
      title: "Brake fade",
      description: "Brakes losing effectiveness",
      teamCarNumber: "42",
      carSessionId: 10,
      severity: "High",
      status: "Open",
      reportedAt: "2024-12-16T10:00:00Z",
      teamCarId: 1,
      reportedByUserId: 1,
      reportedByName: "Manager User",
      linkedWorkOrderId: 1,
      closedAt: null,
    },
  ],
  openWorkOrders: [
    {
      id: 1,
      title: "Replace brake pads",
      description: "Front brake pads worn",
      priority: "High",
      status: "In Progress",
      assignedToName: "Mike Mechanic",
      createdAt: "2024-12-16T11:00:00Z",
      teamCarId: 1,
      teamCarNumber: "42",
      createdByName: "Manager User",
      createdByUserId: 1,
      assignedToUserId: 2,
      carSessionId: null,
      dueDate: null,
      closedAt: null,
    },
  ],
};

const mockUsers: UserRead[] = [
  {
    id: 1,
    firstName: "Manager",
    lastName: "User",
    email: "manager@test.com",
    roles: ["Manager"],
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: 2,
    firstName: "Mike",
    lastName: "Mechanic",
    email: "mechanic@test.com",
    roles: ["Mechanic"],
    isActive: true,
    createdAt: "2024-01-02T10:00:00Z",
  },
];

const mockSessions: CarSessionRead[] = [
  {
    id: 10,
    sessionType: "Race",
    trackName: "Spa-Francorchamps",
    date: "2024-12-15",
    laps: 25,
    driverName: "John Driver",
    teamCarId: 1,
    teamCarNumber: "42",
    driverUserId: 5,
    notes: "Great session",
  },
  {
    id: 9,
    sessionType: "Practice",
    trackName: "Monza",
    date: "2024-12-10",
    laps: 30,
    driverName: "Jane Driver",
    teamCarId: 1,
    teamCarNumber: "42",
    driverUserId: 6,
    notes: null,
  },
];

function renderWithProviders(carId: number, userOverride?: TestUser) {
  const defaultUser: TestUser = {
    userId: 1,
    firstName: "Test",
    lastName: "Manager",
    email: "manager@test.com",
    roles: ["Manager"],
    expiresAtUtc: "2026-12-31T23:59:59Z",
  };

  localStorage.clear();
  localStorage.setItem("accessToken", createMockJwt("Test Manager"));
  localStorage.setItem("user", JSON.stringify(userOverride || defaultUser));

  return render(
    <MemoryRouter initialEntries={[`/team-cars/${carId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/team-cars/:id" element={<TeamCarPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("TeamCarPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGetTeamCarDashboard.mockResolvedValue(mockDashboard);
    mockListUsers.mockResolvedValue(mockUsers);
    mockListCarSessions.mockResolvedValue(mockSessions);
  });

  it("renders page with car details", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });
  });

  it("loads dashboard data on mount", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(mockGetTeamCarDashboard).toHaveBeenCalledWith(1);
      expect(mockListUsers).toHaveBeenCalled();
      expect(mockListCarSessions).toHaveBeenCalled();
    });
  });

  it("displays page title with car details", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });
  });

  it("displays car details card", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Silver Bullet")).toBeInTheDocument();
      expect(screen.getByText("GT3")).toBeInTheDocument();
    });

    expect(screen.getByText(/km/)).toBeInTheDocument();
    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it("displays latest session information", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText(/Race @Spa-Francorchamps/)).toBeInTheDocument();
      expect(screen.getByText(/Driver: John Driver/)).toBeInTheDocument();
      expect(screen.getByText(/Laps:25/)).toBeInTheDocument();
    });
  });

  it("displays no sessions message when no latest session", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      latestSession: null,
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("No sessions yet.")).toBeInTheDocument();
    });
  });

  it("displays open items counts", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("1 issues")).toBeInTheDocument();
      expect(screen.getByText("1 work orders")).toBeInTheDocument();
    });
  });

  it("displays sessions table with data", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Race")).toBeInTheDocument();
      expect(screen.getByText("Practice")).toBeInTheDocument();
      expect(screen.getByText("Spa-Francorchamps")).toBeInTheDocument();
      expect(screen.getByText("Monza")).toBeInTheDocument();
    });
  });

  it("displays sessions sorted by date descending", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Race")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const dataRows = rows.filter(
      (row) =>
        row.textContent?.includes("Race") ||
        row.textContent?.includes("Practice"),
    );

    const raceIndex = dataRows.findIndex((row) =>
      row.textContent?.includes("Race"),
    );
    const practiceIndex = dataRows.findIndex((row) =>
      row.textContent?.includes("Practice"),
    );

    expect(raceIndex).toBeLessThan(practiceIndex);
  });

  it("displays empty sessions state", async () => {
    mockListCarSessions.mockResolvedValue([]);

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const emptyMessages = screen.getAllByText("No sessions yet.");
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it("displays open issues table with data", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Brake fade")).toBeInTheDocument();
      expect(
        screen.getByText("Brakes losing effectiveness"),
      ).toBeInTheDocument();
    });

    const highBadges = screen.getAllByText("High");
    expect(highBadges.length).toBeGreaterThan(0);
    const openBadges = screen.getAllByText("Open");
    expect(openBadges.length).toBeGreaterThan(0);
  });

  it("displays session badge in issues table", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Session #10")).toBeInTheDocument();
    });
  });

  it("displays empty issues state", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openIssues: [],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("No open issues.")).toBeInTheDocument();
    });
  });

  it("displays open work orders table with data", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
      expect(screen.getByText("Front brake pads worn")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Mike Mechanic")).toBeInTheDocument();
    });
  });

  it("displays empty work orders state", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openWorkOrders: [],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("No open work orders.")).toBeInTheDocument();
    });
  });

  it("shows Edit car button for Manager", async () => {
    renderWithProviders(1, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /edit car/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Edit car button for Mechanic", async () => {
    renderWithProviders(1, {
      userId: 2,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /edit car/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides Edit car button for Driver", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /edit car/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Add session button for Manager", async () => {
    renderWithProviders(1, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add session/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Add session button for Driver", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add session/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides Add session button for Viewer", async () => {
    renderWithProviders(1, {
      userId: 4,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@test.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /add session/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Add issue button for Manager", async () => {
    renderWithProviders(1, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add issue/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Add issue button for Driver", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add issue/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides Add issue button for Mechanic", async () => {
    renderWithProviders(1, {
      userId: 2,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /add issue/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Add work order button for Manager", async () => {
    renderWithProviders(1, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add work order/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Add work order button for Mechanic", async () => {
    renderWithProviders(1, {
      userId: 2,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add work order/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides Add work order button for Driver", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /add work order/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates back on Back click", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates to car sessions on View all sessions click", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Race")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const viewAllButtons = screen.getAllByRole("button", { name: /view all/i });
    const sessionsViewAll = viewAllButtons[0];

    await user.click(sessionsViewAll);

    expect(mockNavigate).toHaveBeenCalledWith("/car-sessions");
  });

  it("navigates to issue reports on View all issues click", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Brake fade")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const viewAllButtons = screen.getAllByRole("button", { name: /view all/i });
    const issuesViewAll = viewAllButtons[1];

    await user.click(issuesViewAll);

    expect(mockNavigate).toHaveBeenCalledWith("/issue-reports");
  });

  it("navigates to work orders on View all work orders click", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const viewAllButtons = screen.getAllByRole("button", { name: /view all/i });
    const workOrdersViewAll = viewAllButtons[2];

    await user.click(workOrdersViewAll);

    expect(mockNavigate).toHaveBeenCalledWith("/work-orders");
  });

  it("navigates to work order details on row click", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const workOrderRow = screen.getByText("Replace brake pads").closest("tr");

    if (workOrderRow) {
      await user.click(workOrderRow);
      expect(mockNavigate).toHaveBeenCalledWith("/work-orders/1");
    }
  });

  it("handles invalid car ID", async () => {
    renderWithProviders(0);

    await waitFor(() => {
      expect(screen.getByText("Invalid car id.")).toBeInTheDocument();
    });

    expect(mockGetTeamCarDashboard).not.toHaveBeenCalled();
  });

  it("displays error message on load failure", async () => {
    const errorMessage = "Failed to load dashboard";
    mockGetTeamCarDashboard.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });
  });

  it("handles missing users API gracefully", async () => {
    mockListUsers.mockRejectedValue(new Error("Users API failed"));

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(mockGetTeamCarDashboard).toHaveBeenCalled();
  });

  it("handles missing sessions API gracefully", async () => {
    mockListCarSessions.mockRejectedValue(new Error("Sessions API failed"));

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(mockGetTeamCarDashboard).toHaveBeenCalled();
  });

  it("displays dash for missing assignedTo in work orders", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openWorkOrders: [
        {
          id: 2,
          title: "Check engine",
          description: "Engine light on",
          priority: "Medium",
          status: "Open",
          assignedToName: null,
          createdAt: "2024-12-17T10:00:00Z",
          teamCarId: 1,
          teamCarNumber: "42",
          createdByName: "Manager User",
          createdByUserId: 1,
          assignedToUserId: null,
          carSessionId: null,
          dueDate: null,
          closedAt: null,
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Check engine")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const workOrderRow = rows.find((row) =>
      row.textContent?.includes("Check engine"),
    );
    expect(workOrderRow?.textContent).toContain("—");
  });

  it("displays dash for missing linked issue in work orders", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openWorkOrders: [
        {
          id: 2,
          title: "Check engine",
          description: "Engine light on",
          priority: "Medium",
          status: "Open",
          assignedToName: "Mike Mechanic",
          createdAt: "2024-12-17T10:00:00Z",
          teamCarId: 1,
          teamCarNumber: "42",
          createdByName: "Manager User",
          createdByUserId: 1,
          assignedToUserId: 2,
          carSessionId: null,
          dueDate: null,
          closedAt: null,
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Check engine")).toBeInTheDocument();
    });
  });

  it("displays dash for missing car session in issues", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openIssues: [
        {
          id: 2,
          title: "Oil leak",
          description: "Oil leaking",
          teamCarNumber: "42",
          carSessionId: null,
          severity: "Medium",
          status: "Open",
          reportedAt: "2024-12-17T10:00:00Z",
          teamCarId: 1,
          reportedByUserId: 1,
          reportedByName: "Manager User",
          linkedWorkOrderId: null,
          closedAt: null,
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Oil leak")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const issueRow = rows.find((row) => row.textContent?.includes("Oil leak"));
    expect(issueRow?.textContent).toContain("—");
  });

  it("opens edit car dialog when Edit car button clicked", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: /edit car/i });
    await user.click(editButton);

    expect(screen.getByTestId("team-car-dialog")).toBeInTheDocument();
  });

  it("calls load when edit car dialog saved", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: /edit car/i });
    await user.click(editButton);

    const saveButton = screen.getByRole("button", { name: /save car/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("resets editing car when dialog closed via onOpenChange", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: /edit car/i });
    await user.click(editButton);

    const closeButton = screen.getByRole("button", { name: /close car/i });
    await user.click(closeButton);

    expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(1);
  });

  it("opens work order dialog when Add work order clicked", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add work order/i });
    await user.click(addButton);

    expect(screen.getByTestId("work-order-dialog")).toBeInTheDocument();
  });

  it("calls load when work order dialog saved", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add work order/i });
    await user.click(addButton);

    const saveButton = screen.getByRole("button", { name: /save wo/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("opens issue dialog when Add issue clicked", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add issue/i });
    await user.click(addButton);

    expect(screen.getByTestId("issue-dialog")).toBeInTheDocument();
  });

  it("calls load when issue dialog saved", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add issue/i });
    await user.click(addButton);

    const saveButton = screen.getByRole("button", { name: /save issue/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("opens session dialog when Add session clicked", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add session/i });
    await user.click(addButton);

    expect(screen.getByTestId("session-dialog")).toBeInTheDocument();
  });

  it("calls load when session dialog saved", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add session/i });
    await user.click(addButton);

    const saveButton = screen.getByRole("button", { name: /save session/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("resets editing session when dialog closed via onOpenChange", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addButton = screen.getByRole("button", { name: /add session/i });
    await user.click(addButton);

    const closeButton = screen.getByRole("button", { name: /close session/i });
    await user.click(closeButton);

    expect(mockGetTeamCarDashboard).toHaveBeenCalledTimes(1);
  });

  it("does not render edit car dialog for non-Manager/Mechanic", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("team-car-dialog")).not.toBeInTheDocument();
  });

  it("does not render work order dialog for non-Manager/Mechanic", async () => {
    renderWithProviders(1, {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("work-order-dialog")).not.toBeInTheDocument();
  });

  it("does not render issue dialog for Mechanic", async () => {
    renderWithProviders(1, {
      userId: 2,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("issue-dialog")).not.toBeInTheDocument();
  });

  it("displays session notes when available", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Great session")).toBeInTheDocument();
    });
  });

  it("does not display session notes when null", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Practice")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const practiceRow = rows.find((row) =>
      row.textContent?.includes("Practice"),
    );
    expect(practiceRow).toBeTruthy();
  });

  it("displays issue description when available", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("Brakes losing effectiveness"),
      ).toBeInTheDocument();
    });
  });

  it("displays dash for missing issue description", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openIssues: [
        {
          id: 2,
          title: "Oil leak",
          description: "",
          teamCarNumber: "42",
          carSessionId: null,
          severity: "Medium",
          status: "Open",
          reportedAt: "2024-12-17T10:00:00Z",
          teamCarId: 1,
          reportedByUserId: 1,
          reportedByName: "Manager User",
          linkedWorkOrderId: null,
          closedAt: null,
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Oil leak")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const issueRow = rows.find((row) => row.textContent?.includes("Oil leak"));
    expect(issueRow?.textContent).toContain("—");
  });

  it("displays work order description when available", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Front brake pads worn")).toBeInTheDocument();
    });
  });

  it("displays dash for missing work order description", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      openWorkOrders: [
        {
          id: 2,
          title: "Check engine",
          description: "",
          priority: "Medium",
          status: "Open",
          assignedToName: "Mike Mechanic",
          createdAt: "2024-12-17T10:00:00Z",
          teamCarId: 1,
          teamCarNumber: "42",
          createdByName: "Manager User",
          createdByUserId: 1,
          assignedToUserId: 2,
          carSessionId: null,
          dueDate: null,
          closedAt: null,
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Check engine")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const workOrderRow = rows.find((row) =>
      row.textContent?.includes("Check engine"),
    );
    expect(workOrderRow?.textContent).toContain("—");
  });

  it("does not display nickname when empty", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        nickname: "",
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Silver Bullet")).not.toBeInTheDocument();
  });

  it("does not display carClass when empty", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        carClass: "",
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("GT3")).not.toBeInTheDocument();
  });

  it("does not display odometer when zero", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        odometerKm: 0,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });

  it("filters sessions for specific car", async () => {
    const otherCarSessions: CarSessionRead[] = [
      {
        id: 20,
        sessionType: "Qualifying",
        trackName: "Silverstone",
        date: "2024-12-18",
        laps: 15,
        driverName: "Bob Driver",
        teamCarId: 2,
        teamCarNumber: "99",
        driverUserId: 7,
        notes: null,
      },
    ];

    mockListCarSessions.mockResolvedValue([
      ...mockSessions,
      ...otherCarSessions,
    ]);

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Race")).toBeInTheDocument();
    });

    expect(screen.queryByText("Silverstone")).not.toBeInTheDocument();
  });

  it("displays driver name as dash when null in latest session", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      latestSession: {
        ...mockDashboard.latestSession!,
        driverName: null,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText(/Race @Spa-Francorchamps/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Driver: —/)).toBeInTheDocument();
  });

  it("displays driver name as dash when null in sessions table", async () => {
    mockListCarSessions.mockResolvedValue([
      {
        ...mockSessions[0],
        driverName: null,
      },
    ]);

    renderWithProviders(1);

    await waitFor(() => {
      expect(screen.getByText("Race")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const sessionRow = rows.find((row) => row.textContent?.includes("Race"));
    expect(sessionRow?.textContent).toContain("—");
  });

  it("handles nickname with only whitespace", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        nickname: "   ",
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Nickname")).not.toBeInTheDocument();
  });

  it("handles carClass with only whitespace", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        carClass: "   ",
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Class")).not.toBeInTheDocument();
  });

  it("handles invalid date formats gracefully", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      latestSession: {
        ...mockDashboard.latestSession!,
        date: "invalid-date",
      },
      openIssues: [
        {
          ...mockDashboard.openIssues[0],
          reportedAt: "invalid-datetime",
        },
      ],
      openWorkOrders: [
        {
          ...mockDashboard.openWorkOrders[0],
          createdAt: "invalid-datetime",
        },
      ],
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Brake fade")).toBeInTheDocument();
  });

  it("handles null dates gracefully", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      latestSession: {
        ...mockDashboard.latestSession!,
        date: null as unknown as string,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const latestSessionCard = screen
      .getByText(/Latest Session/i)
      .closest(".p-4");
    expect(latestSessionCard?.textContent).toContain("—");
  });

  it("handles null nickname in car data", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        nickname: null as unknown as string,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Nickname")).not.toBeInTheDocument();
  });

  it("handles null carClass in car data", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        carClass: null as unknown as string,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Class")).not.toBeInTheDocument();
  });

  it("handles null odometerKm in car data", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
      car: {
        ...mockDashboard.car,
        odometerKm: null as unknown as number,
      },
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Odometer/)).not.toBeInTheDocument();
  });

  it("does not call openCarEdit when data is null", async () => {
    mockGetTeamCarDashboard.mockResolvedValue({
      ...mockDashboard,
    });

    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: /edit car/i });
    await user.click(editButton);

    expect(screen.getByTestId("team-car-dialog")).toBeInTheDocument();
  });

  it("does not open dialogs when user is null", async () => {
    localStorage.clear();

    renderWithProviders(1, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const addWOButton = screen.getByRole("button", {
      name: /add work order/i,
    });
    await user.click(addWOButton);

    expect(screen.getByTestId("work-order-dialog")).toBeInTheDocument();
  });

  it("renders dialogs conditionally based on data availability", async () => {
    renderWithProviders(1);

    await waitFor(() => {
      expect(
        screen.getByText("#42 — Porsche 911 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();

    const addSessionButton = screen.getByRole("button", {
      name: /add session/i,
    });
    await user.click(addSessionButton);
    expect(screen.getByTestId("session-dialog")).toBeInTheDocument();
  });
});
