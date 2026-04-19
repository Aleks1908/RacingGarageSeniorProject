import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import TeamCarsPage from "../TeamCarsPage";
import { createMockJwt } from "@/test-utils";
import * as teamCarsApi from "@/api/teamCars";
import type { TeamCarRead } from "@/api/teamCars/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/teamCars");
jest.mock("@/components/TeamCarUpsertDialog/TeamCarUpsertDialog", () => ({
  TeamCarUpsertDialog: () => <div data-testid="team-car-dialog">Dialog</div>,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListTeamCars = teamCarsApi.listTeamCars as jest.MockedFunction<
  typeof teamCarsApi.listTeamCars
>;
const mockDeleteTeamCar = teamCarsApi.deleteTeamCar as jest.MockedFunction<
  typeof teamCarsApi.deleteTeamCar
>;

const mockCars: TeamCarRead[] = [
  {
    id: 1,
    carNumber: "42",
    make: "Porsche",
    model: "911 GT3",
    year: 2023,
    status: "Active",
    nickname: "Silver Bullet",
    carClass: "GT3",
    odometerKm: 15000,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: 2,
    carNumber: "17",
    make: "Ferrari",
    model: "488 GT3",
    year: 2022,
    status: "Active",
    nickname: "Red Rocket",
    carClass: "GT3",
    odometerKm: 20000,
    createdAt: "2024-01-02T11:00:00Z",
  },
  {
    id: 3,
    carNumber: "99",
    make: "BMW",
    model: "M4 GT3",
    year: 2024,
    status: "Maintenance",
    nickname: "",
    carClass: "GT3",
    odometerKm: 5000,
    createdAt: "2024-01-03T12:00:00Z",
  },
];

function renderWithProviders(userOverride?: TestUser) {
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
    <MemoryRouter>
      <AuthProvider>
        <TeamCarsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("TeamCarsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockListTeamCars.mockResolvedValue(mockCars);
  });

  it("renders page title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(
      screen.getByText("Cars list and quick management"),
    ).toBeInTheDocument();
  });

  it("loads cars on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListTeamCars).toHaveBeenCalled();
    });
  });

  it("displays cars count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("3 cars")).toBeInTheDocument();
    });
  });

  it("displays cars in table", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
      expect(screen.getByText("Ferrari 488 GT3 (2022)")).toBeInTheDocument();
      expect(screen.getByText("BMW M4 GT3 (2024)")).toBeInTheDocument();
    });
  });

  it("displays car numbers", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("17")).toBeInTheDocument();
      expect(screen.getByText("99")).toBeInTheDocument();
    });
  });

  it("displays car nicknames", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Silver Bullet")).toBeInTheDocument();
      expect(screen.getByText("Red Rocket")).toBeInTheDocument();
    });
  });

  it("displays dash for empty nickname", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BMW M4 GT3 (2024)")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const bmwRow = rows.find((row) => row.textContent?.includes("BMW M4 GT3"));
    expect(bmwRow?.textContent).toContain("—");
  });

  it("displays car class and status", async () => {
    renderWithProviders();

    await waitFor(() => {
      const gt3Badges = screen.getAllByText("GT3");
      expect(gt3Badges.length).toBe(3);
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBe(2);
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
    });
  });

  it("displays odometer values", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("15000")).toBeInTheDocument();
      expect(screen.getByText("20000")).toBeInTheDocument();
      expect(screen.getByText("5000")).toBeInTheDocument();
    });
  });

  it("shows empty state when no cars", async () => {
    mockListTeamCars.mockResolvedValue([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No cars yet.")).toBeInTheDocument();
    });
  });

  it("shows New Car button for Manager", async () => {
    renderWithProviders({
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /new car/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows New Car button for Mechanic", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /new car/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides New Car button for Driver", async () => {
    renderWithProviders({
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /new car/i }),
    ).not.toBeInTheDocument();
  });

  it("refreshes cars on Refresh click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListTeamCars).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockListTeamCars).toHaveBeenCalledTimes(2);
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates to car details on row click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const carRow = screen.getByText("Porsche 911 GT3 (2023)").closest("tr");

    if (carRow) {
      await user.click(carRow);
      expect(mockNavigate).toHaveBeenCalledWith("/team-cars/1");
    }
  });

  it("deletes car with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Delete car 42? This cannot be undone.",
      );
      expect(mockDeleteTeamCar).toHaveBeenCalledWith(1);
    });
  });

  it("cancels delete when confirmation declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    expect(mockDeleteTeamCar).not.toHaveBeenCalled();
  });

  it("shows alert on delete failure", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    const errorMessage = "Cannot delete car";
    mockDeleteTeamCar.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("disables edit and delete buttons for non-Manager/Mechanic users", async () => {
    renderWithProviders({
      userId: 4,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole("button");
    const disabledEditButtons = allButtons.filter((btn) => {
      const svg = btn.querySelector("svg");
      return (
        svg &&
        btn.hasAttribute("disabled") &&
        !btn.classList.contains("bg-destructive")
      );
    });

    expect(disabledEditButtons.length).toBeGreaterThan(0);
  });

  it("displays error message on load failure", async () => {
    const errorMessage = "Failed to load team cars";
    mockListTeamCars.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });
  });

  it("does not navigate to car details when clicking action buttons", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Porsche 911 GT3 (2023)")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const editButtons = screen.getAllByRole("button");
    const pencilButtons = editButtons.filter(
      (btn) =>
        btn.querySelector("svg") && !btn.classList.contains("bg-destructive"),
    );

    await user.click(pencilButtons[3]);

    expect(mockNavigate).not.toHaveBeenCalledWith("/team-cars/1");
  });
});
