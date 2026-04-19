import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import InventoryLocationsPage from "../InventoryLocationsPage";
import { createMockJwt } from "@/test-utils";
import * as api from "@/api/inventoryLocations";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/inventoryLocations");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListInventoryLocations =
  api.listInventoryLocations as jest.MockedFunction<
    typeof api.listInventoryLocations
  >;
const mockDeleteInventoryLocation =
  api.deleteInventoryLocation as jest.MockedFunction<
    typeof api.deleteInventoryLocation
  >;

const mockItems: InventoryLocationRead[] = [
  {
    id: 1,
    name: "Main Warehouse",
    code: "WH-001",
    description: "Primary storage",
    createdAt: "2024-01-02T10:00:00Z",
    isActive: true,
  },
  {
    id: 2,
    name: "Trackside Tent",
    code: "TS-01",
    description: "Spare parts near pit lane",
    createdAt: "2024-02-15T09:30:00Z",
    isActive: false,
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
        <InventoryLocationsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderWithoutUser() {
  localStorage.clear();

  return render(
    <MemoryRouter>
      <AuthProvider>
        <InventoryLocationsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("InventoryLocationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListInventoryLocations.mockResolvedValue(mockItems);
    mockDeleteInventoryLocation.mockResolvedValue();
    mockNavigate.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).confirm = jest.fn(() => true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).alert = jest.fn();
  });

  it("renders title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Inventory Locations")).toBeInTheDocument();
    expect(screen.getByText("Location management")).toBeInTheDocument();
  });

  it("loads data on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListInventoryLocations).toHaveBeenCalledWith({
        activeOnly: false,
      });
      expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      expect(screen.getByText("Trackside Tent")).toBeInTheDocument();
    });
  });

  it("shows count of locations", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("2 locations")).toBeInTheDocument();
    });
  });

  it("filters by search across name/code/description", async () => {
    renderWithProviders();

    await waitFor(() => screen.getByText("Main Warehouse"));

    const search = screen.getByPlaceholderText(
      "Search by name, code, description...",
    );

    await userEvent.type(search, "TS-01");

    expect(screen.queryByText("Main Warehouse")).not.toBeInTheDocument();
    expect(screen.getByText("Trackside Tent")).toBeInTheDocument();
  });

  it("toggles active only and reloads", async () => {
    renderWithProviders();

    await waitFor(() => screen.getByText("2 locations"));

    mockListInventoryLocations.mockClear();

    fireEvent.click(screen.getByText("Disabled"));

    await waitFor(() => {
      expect(mockListInventoryLocations).toHaveBeenCalledWith({
        activeOnly: true,
      });
    });
  });

  it("shows error when load fails", async () => {
    mockListInventoryLocations.mockRejectedValueOnce(new Error("Boom"));
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Couldn’t load locations")).toBeInTheDocument();
      expect(screen.getByText("Boom")).toBeInTheDocument();
    });
  });

  it("refreshes data when clicking refresh", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText("2 locations"));

    mockListInventoryLocations.mockClear();

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(mockListInventoryLocations).toHaveBeenCalledWith({
        activeOnly: false,
      });
    });
  });

  it("deletes a location after confirmation", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText("Main Warehouse"));

    fireEvent.click(screen.getAllByTitle("Deactivate")[0]);

    await waitFor(() => {
      expect(mockDeleteInventoryLocation).toHaveBeenCalledWith(1);
    });
  });

  it("navigates back when back button clicked", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByText("2 locations"));

    fireEvent.click(screen.getByText("Back"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows Access denied when user lacks role", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Driver",
      lastName: "User",
      email: "driver@example.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only Parts Clerks and Managers can manage inventory locations.",
      ),
    ).toBeInTheDocument();
  });

  it("prompts sign in when no user", () => {
    renderWithoutUser();

    expect(screen.getByText("Please sign in.")).toBeInTheDocument();
  });

  it("shows badges and descriptions", async () => {
    renderWithProviders();

    await screen.findByText("Primary storage");
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("shows empty state when no results", async () => {
    mockListInventoryLocations.mockResolvedValueOnce([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("0 locations")).toBeInTheDocument();
      expect(screen.getByText("No locations found.")).toBeInTheDocument();
    });
  });
});
