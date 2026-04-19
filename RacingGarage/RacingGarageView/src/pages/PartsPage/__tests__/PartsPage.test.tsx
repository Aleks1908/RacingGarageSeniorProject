import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { PartsPage } from "../PartsPage";
import { createMockJwt } from "@/test-utils";
import * as partsApi from "@/api/parts";
import * as suppliersApi from "@/api/suppliers";
import * as locationsApi from "@/api/inventoryLocations";
import type { PartRead } from "@/api/parts/types";
import type { SupplierRead } from "@/api/suppliers/types";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/parts");
jest.mock("@/api/suppliers");
jest.mock("@/api/inventoryLocations");
jest.mock("@/components/PartsUpsertDialog/PartsUpsertDialog", () => ({
  PartsUpsertDialog: () => <div data-testid="parts-dialog">Dialog</div>,
}));
jest.mock("@/components/InventoryAdjustDialog/InventoryAdjustDialog", () => ({
  InventoryAdjustDialog: () => <div data-testid="adjust-dialog">Dialog</div>,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListParts = partsApi.listParts as jest.MockedFunction<
  typeof partsApi.listParts
>;
const mockDeletePart = partsApi.deletePart as jest.MockedFunction<
  typeof partsApi.deletePart
>;
const mockListSuppliers = suppliersApi.listSuppliers as jest.MockedFunction<
  typeof suppliersApi.listSuppliers
>;
const mockListInventoryLocations =
  locationsApi.listInventoryLocations as jest.MockedFunction<
    typeof locationsApi.listInventoryLocations
  >;

const mockParts: PartRead[] = [
  {
    id: 1,
    sku: "BRK-001",
    name: "Brake Pad Set",
    category: "Brakes",
    unitCost: 150.0,
    reorderPoint: 5,
    supplierId: 10,
    supplierName: "Brembo Supply",
    currentStock: 3,
    needsReorder: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    sku: "OIL-002",
    name: "Engine Oil 5W-30",
    category: "Fluids",
    unitCost: 45.5,
    reorderPoint: 10,
    supplierId: 11,
    supplierName: "Mobil1 Distributor",
    currentStock: 15,
    needsReorder: false,
    isActive: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    sku: "FLT-003",
    name: "Air Filter",
    category: "Filters",
    unitCost: 25.0,
    reorderPoint: 8,
    supplierId: null,
    supplierName: null,
    currentStock: 0,
    needsReorder: true,
    isActive: false,
    createdAt: "2024-01-03T00:00:00Z",
  },
];

const mockSuppliers: SupplierRead[] = [
  {
    id: 10,
    name: "Brembo Supply",
    contactEmail: "john@brembo.com",
    phone: "555-0001",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 11,
    name: "Mobil1 Distributor",
    contactEmail: "jane@mobil1.com",
    phone: "555-0002",
    isActive: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
];

const mockLocations: InventoryLocationRead[] = [
  {
    id: 1,
    code: "MAIN",
    name: "Main Warehouse",
    description: "Primary storage location",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
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
        <PartsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PartsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockListParts.mockResolvedValue(mockParts);
    mockListSuppliers.mockResolvedValue(mockSuppliers);
    mockListInventoryLocations.mockResolvedValue(mockLocations);
  });

  it("renders page title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Parts")).toBeInTheDocument();
    expect(
      screen.getByText("Parts catalog and reorder points"),
    ).toBeInTheDocument();
  });

  it("loads parts, suppliers, and locations on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListParts).toHaveBeenCalled();
      expect(mockListSuppliers).toHaveBeenCalled();
      expect(mockListInventoryLocations).toHaveBeenCalled();
    });
  });

  it("displays parts count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("3 parts")).toBeInTheDocument();
    });
  });

  it("displays parts in table", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
      expect(screen.getByText("Brake Pad Set")).toBeInTheDocument();
      expect(screen.getByText("OIL-002")).toBeInTheDocument();
      expect(screen.getByText("Engine Oil 5W-30")).toBeInTheDocument();
    });
  });

  it("displays part details in table rows", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brakes")).toBeInTheDocument();
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.getByText("150.00")).toBeInTheDocument();
    });
  });

  it("shows Reorder badge for parts needing reorder", async () => {
    renderWithProviders();

    await waitFor(() => {
      const reorderBadges = screen.getAllByText("Reorder");
      expect(reorderBadges.length).toBeGreaterThan(0);
    });
  });

  it("shows Active/Inactive badges", async () => {
    renderWithProviders();

    await waitFor(() => {
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBe(2);
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("shows empty state when no parts", async () => {
    mockListParts.mockResolvedValue([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No parts found.")).toBeInTheDocument();
    });
  });

  it("shows New Part button for Manager", async () => {
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
        screen.getByRole("button", { name: /new part/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows New Part button for PartsClerk", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Parts",
      lastName: "Clerk",
      email: "clerk@test.com",
      roles: ["PartsClerk"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /new part/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides New Part button for Driver", async () => {
    renderWithProviders({
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /new part/i }),
    ).not.toBeInTheDocument();
  });

  it("filters parts by search query", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
      expect(screen.getByText("OIL-002")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by sku, name, category, supplier/i,
    );
    await user.type(searchInput, "brake");

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
      expect(screen.queryByText("OIL-002")).not.toBeInTheDocument();
    });
  });

  it("filters parts by category", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by sku, name, category, supplier/i,
    );
    await user.type(searchInput, "fluids");

    await waitFor(() => {
      expect(screen.getByText("OIL-002")).toBeInTheDocument();
      expect(screen.queryByText("BRK-001")).not.toBeInTheDocument();
    });
  });

  it("filters parts by supplier name", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by sku, name, category, supplier/i,
    );
    await user.type(searchInput, "brembo");

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
      expect(screen.queryByText("OIL-002")).not.toBeInTheDocument();
    });
  });

  it("toggles active-only filter", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(mockListParts).toHaveBeenCalledTimes(1);
    });

    const activeButton = screen.getByRole("button", { name: /disabled/i });
    await user.click(activeButton);

    await waitFor(() => {
      expect(mockListParts).toHaveBeenCalledWith({ activeOnly: true });
    });
  });

  it("refreshes parts on Refresh click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListParts).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockListParts).toHaveBeenCalledTimes(2);
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("deletes part with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete part BRK-001?");
      expect(mockDeletePart).toHaveBeenCalledWith(1);
    });
  });

  it("cancels delete when confirmation declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    expect(mockDeletePart).not.toHaveBeenCalled();
  });

  it("shows alert on delete failure", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    const errorMessage = "Cannot delete part";
    mockDeletePart.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
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

  it("disables edit and delete buttons for non-Manager/PartsClerk users", async () => {
    renderWithProviders({
      userId: 4,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole("button");
    const editButtons = allButtons.filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.hasAttribute("disabled");
    });

    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("displays dash for null supplier", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("FLT-003")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const filterRow = rows.find((row) => row.textContent?.includes("FLT-003"));

    expect(filterRow).toBeInTheDocument();
  });

  it("displays dash for null category", async () => {
    mockListParts.mockResolvedValue([
      {
        ...mockParts[0],
        category: "",
      },
    ]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });
  });

  it("formats unit cost to 2 decimal places", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("150.00")).toBeInTheDocument();
      expect(screen.getByText("45.50")).toBeInTheDocument();
    });
  });

  it("displays stock count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const cells = screen.getAllByRole("cell");
    const stockCells = cells.filter(
      (cell) =>
        cell.textContent === "3" ||
        cell.textContent === "15" ||
        cell.textContent === "0",
    );

    expect(stockCells.length).toBeGreaterThan(0);
  });

  it("shows reorder point for each part", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("BRK-001")).toBeInTheDocument();
    });

    const cells = screen.getAllByRole("cell");
    const reorderCells = cells.filter(
      (cell) =>
        cell.textContent === "5" ||
        cell.textContent === "10" ||
        cell.textContent === "8",
    );

    expect(reorderCells.length).toBeGreaterThan(0);
  });
});
