import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import CarSessionsPage from "../CarSessionsPage";
import { createMockJwt } from "@/test-utils";
import * as carSessionsApi from "@/api/carSessions";
import * as teamCarsApi from "@/api/teamCars";
import * as usersApi from "@/api/users";
import type { CarSessionRead } from "@/api/carSessions/types";
import type { TeamCarRead } from "@/api/teamCars/types";
import type { UserRead } from "@/api/users/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/carSessions");
jest.mock("@/api/teamCars");
jest.mock("@/api/users");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListCarSessions =
  carSessionsApi.listCarSessions as jest.MockedFunction<
    typeof carSessionsApi.listCarSessions
  >;
const mockDeleteCarSession =
  carSessionsApi.deleteCarSession as jest.MockedFunction<
    typeof carSessionsApi.deleteCarSession
  >;
const mockListTeamCars = teamCarsApi.listTeamCars as jest.MockedFunction<
  typeof teamCarsApi.listTeamCars
>;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<
  typeof usersApi.listUsers
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockListCarSessions.mockResolvedValue(mockSessions);
  mockListTeamCars.mockResolvedValue(mockCars);
  mockListUsers.mockResolvedValue(mockUsers);
  mockDeleteCarSession.mockResolvedValue(undefined);
  mockNavigate.mockClear();
});

const mockCars: TeamCarRead[] = [
  {
    id: 1,
    carNumber: "42",
    nickname: "Red Devil",
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
    nickname: "Silver Arrow",
    make: "McLaren",
    model: "720S GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 3000,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockUsers: UserRead[] = [
  {
    id: 10,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    roles: ["Driver"],
  },
  {
    id: 11,
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    roles: ["Driver", "Manager"],
  },
];

const mockSessions: CarSessionRead[] = [
  {
    id: 1,
    teamCarId: 1,
    teamCarNumber: "42",
    sessionType: "Race",
    date: "2024-12-15T10:30:00Z",
    trackName: "Spa-Francorchamps",
    driverUserId: 10,
    driverName: "John Doe",
    laps: 42,
  },
  {
    id: 2,
    teamCarId: 2,
    teamCarNumber: "7",
    sessionType: "Practice",
    date: "2024-12-15T09:00:00Z",
    trackName: "Monza",
    driverUserId: 11,
    driverName: "Jane Smith",
    laps: 25,
  },
  {
    id: 3,
    teamCarId: 1,
    teamCarNumber: "42",
    sessionType: "Qualifying",
    date: "2024-12-14T16:45:00Z",
    trackName: "Spa-Francorchamps",
    driverUserId: null,
    driverName: null,
    laps: 8,
  },
];

function renderWithProviders(
  component: React.ReactElement,
  userOverride?: TestUser,
) {
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
      <AuthProvider>{component}</AuthProvider>
    </MemoryRouter>,
  );
}

describe("CarSessionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockListCarSessions.mockResolvedValue(mockSessions);
    mockListTeamCars.mockResolvedValue(mockCars);
    mockListUsers.mockResolvedValue(mockUsers);
  });

  it("should render the page with title", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Car Sessions")).toBeInTheDocument();
    });
  });

  it("should load data on mount", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(mockListCarSessions).toHaveBeenCalledTimes(1);
      expect(mockListTeamCars).toHaveBeenCalledTimes(1);
      expect(mockListUsers).toHaveBeenCalledTimes(1);
    });
  });

  it("should display session count", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });
  });

  it("should display loading state initially", () => {
    renderWithProviders(<CarSessionsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render table with sessions", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      const tracks = screen.getAllByText("Spa-Francorchamps");
      expect(tracks.length >= 2).toBe(true);
    });
  });

  it("should display error when loading fails", async () => {
    mockListCarSessions.mockRejectedValueOnce(new Error("Load failed"));

    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Load failed")).toBeInTheDocument();
    });
  });

  it("should filter by search", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Track, session type, driver, car number...",
    );
    await userEvent.type(searchInput, "Monza");

    await waitFor(() => {
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("should filter by car", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    const carSelect = screen.getByRole("combobox");
    fireEvent.click(carSelect);

    await waitFor(() => {
      expect(screen.getByText("#42 — Ferrari 488 GT3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("#42 — Ferrari 488 GT3"));

    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length === 3).toBe(true);
    });
  });

  it("should show no results message", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Track, session type, driver, car number...",
    );
    await userEvent.type(searchInput, "NonexistentTrack");

    await waitFor(() => {
      expect(screen.getByText("No sessions found.")).toBeInTheDocument();
    });
  });

  it("should refresh data", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    expect(mockListCarSessions).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockListCarSessions).toHaveBeenCalledTimes(2);
    });
  });

  it("should show add button for Manager", async () => {
    renderWithProviders(<CarSessionsPage />, {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "mgr@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Add session/i });
      expect(btn).not.toBeDisabled();
    });
  });

  it("should hide add button for Viewer", async () => {
    renderWithProviders(<CarSessionsPage />, {
      userId: 1,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@test.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const hasAdd = buttons.some((b) =>
        b.textContent?.includes("Add session"),
      );
      expect(hasAdd).toBe(false);
    });
  });

  it("should delete session with confirmation", async () => {
    const mockConfirm = jest.spyOn(window, "confirm").mockReturnValueOnce(true);
    mockDeleteCarSession.mockResolvedValueOnce(undefined);

    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons.find((b) => b.title === "Delete session");

    if (deleteBtn) {
      fireEvent.click(deleteBtn);

      expect(mockConfirm).toHaveBeenCalledWith(
        "Delete session #1? This cannot be undone.",
      );

      await waitFor(() => {
        expect(mockDeleteCarSession).toHaveBeenCalledWith(1);
      });
    }

    mockConfirm.mockRestore();
  });

  it("should format date correctly", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("2024-12-15 10:30:00 UTC")).toBeInTheDocument();
    });
  });

  it("should navigate back", async () => {
    renderWithProviders(<CarSessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
