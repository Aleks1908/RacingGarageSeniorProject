import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { InventoryPage } from "../InventoryPage";
import { createMockJwt } from "@/test-utils";
import * as stockApi from "@/api/inventoryStock";
import * as movementsApi from "@/api/inventoryMovements";
import * as locationsApi from "@/api/inventoryLocations";
import * as partsApi from "@/api/parts";
import type { InventoryStockRead } from "@/api/inventoryStock/types";
import type { InventoryMovementRead } from "@/api/inventoryMovements/types";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";
import type { PartRead } from "@/api/parts/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

interface AdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: InventoryStockRead | null;
  parts: PartRead[];
  locations: InventoryLocationRead[];
  defaultPartId: number | null;
  defaultLocationId: number | null;
  canEdit: boolean;
  onSaved: () => void;
}

const mockAdjustProps = jest.fn<unknown, [AdjustDialogProps]>();
jest.mock("@/components/InventoryAdjustDialog/InventoryAdjustDialog", () => ({
  __esModule: true,
  InventoryAdjustDialog: (props: AdjustDialogProps) => {
    mockAdjustProps(props);
    return (
      <div
        data-testid="adjust-dialog"
        data-open={props.open}
        data-can-edit={props.canEdit}
      />
    );
  },
}));

jest.mock("@/api/inventoryStock");
jest.mock("@/api/inventoryMovements");
jest.mock("@/api/inventoryLocations");
jest.mock("@/api/parts");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListInventoryStock =
  stockApi.listInventoryStock as jest.MockedFunction<
    typeof stockApi.listInventoryStock
  >;
const mockListInventoryMovements =
  movementsApi.listInventoryMovements as jest.MockedFunction<
    typeof movementsApi.listInventoryMovements
  >;
const mockListInventoryLocations =
  locationsApi.listInventoryLocations as jest.MockedFunction<
    typeof locationsApi.listInventoryLocations
  >;
const mockListParts = partsApi.listParts as jest.MockedFunction<
  typeof partsApi.listParts
>;

const mockStock: InventoryStockRead[] = [
  {
    id: 1,
    inventoryLocationId: 1,
    locationCode: "LOC-1",
    partId: 101,
    partName: "Brake Pad",
    partSku: "BP-001",
    quantity: 5,
    updatedAt: "2024-01-01T12:00:00Z",
  },
  {
    id: 2,
    inventoryLocationId: 2,
    locationCode: "LOC-2",
    partId: 102,
    partName: "Oil Filter",
    partSku: "OF-002",
    quantity: 10,
    updatedAt: "2024-01-03T10:00:00Z",
  },
];

const mockMovements: InventoryMovementRead[] = [
  {
    id: 1,
    performedAt: "2024-02-01T10:00:00Z",
    inventoryLocationId: 1,
    locationCode: "LOC-1",
    partId: 101,
    partName: "Brake Pad",
    partSku: "BP-001",
    quantityChange: -2,
    reason: "Install",
    notes: "WO 15",
    workOrderId: 15,
    performedByUserId: 5,
    performedByName: "Tech A",
  },
  {
    id: 2,
    performedAt: "2024-02-02T11:00:00Z",
    inventoryLocationId: 2,
    locationCode: "LOC-2",
    partId: 102,
    partName: "Oil Filter",
    partSku: "OF-002",
    quantityChange: 5,
    reason: "Receive",
    notes: "",
    workOrderId: null,
    performedByUserId: 6,
    performedByName: "Parts Clerk",
  },
];

const mockLocations: InventoryLocationRead[] = [
  {
    id: 1,
    code: "LOC-1",
    name: "Main",
    description: "Main warehouse",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    code: "LOC-2",
    name: "Aux",
    description: "Auxiliary storage",
    isActive: true,
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    code: "LOC-3",
    name: "Inactive",
    description: "Old location",
    isActive: false,
    createdAt: "2024-01-03T00:00:00Z",
  },
];

const mockParts: PartRead[] = [
  {
    id: 101,
    sku: "BP-001",
    name: "Brake Pad",
    category: "Brakes",
    unitCost: 25.5,
    reorderPoint: 10,
    supplierId: 1,
    supplierName: "Brakes Inc",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    currentStock: 5,
    needsReorder: false,
  },
  {
    id: 102,
    sku: "OF-002",
    name: "Oil Filter",
    category: "Fluids",
    unitCost: 15.0,
    reorderPoint: 5,
    supplierId: 2,
    supplierName: "Auto Parts Ltd",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    currentStock: 10,
    needsReorder: false,
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
        <InventoryPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("InventoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdjustProps.mockClear();
    mockListInventoryStock.mockResolvedValue(mockStock);
    mockListInventoryMovements.mockResolvedValue(mockMovements);
    mockListInventoryLocations.mockResolvedValue(mockLocations);
    mockListParts.mockResolvedValue(mockParts);
    mockNavigate.mockClear();
  });

  it("renders title and subtitle", async () => {
    renderWithProviders();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(
      screen.getByText("Stock overview and movements"),
    ).toBeInTheDocument();
    await screen.findByText("Brake Pad");
  });

  it("loads data on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListInventoryStock).toHaveBeenCalledTimes(1);
      expect(mockListInventoryMovements).toHaveBeenCalledTimes(1);
      expect(mockListInventoryLocations).toHaveBeenCalledWith({
        activeOnly: true,
      });
      expect(mockListParts).toHaveBeenCalledWith({ activeOnly: true });
      expect(screen.getByText("Brake Pad")).toBeInTheDocument();
      expect(screen.getByText("Oil Filter")).toBeInTheDocument();
    });
  });

  it("shows stock count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("2 stock rows")).toBeInTheDocument();
    });
  });

  it("filters by location", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    const combos = screen.getAllByRole("combobox");
    await userEvent.click(combos[0]);
    await userEvent.click(screen.getByText("LOC-1 — Main"));

    expect(screen.getByText("Brake Pad")).toBeInTheDocument();
    expect(screen.queryByText("Oil Filter")).not.toBeInTheDocument();
  });

  it("filters by part", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    const combos = screen.getAllByRole("combobox");
    await userEvent.click(combos[1]);
    await userEvent.click(screen.getByText("OF-002 — Oil Filter"));

    expect(screen.getByText("Oil Filter")).toBeInTheDocument();
    expect(screen.queryByText("Brake Pad")).not.toBeInTheDocument();
  });

  it("shows empty state when no stock rows", async () => {
    mockListInventoryStock.mockResolvedValueOnce([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("0 stock rows")).toBeInTheDocument();
      expect(
        screen.getByText("No rows match the filters."),
      ).toBeInTheDocument();
    });
  });

  it("shows error when load fails", async () => {
    mockListInventoryStock.mockRejectedValueOnce(new Error("Boom"));
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Couldn’t load inventory")).toBeInTheDocument();
      expect(screen.getByText("Boom")).toBeInTheDocument();
    });
  });

  it("refreshes data when clicking refresh", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    mockListInventoryStock.mockClear();

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(mockListInventoryStock).toHaveBeenCalledTimes(1);
    });
  });

  it("switches to movements tab and shows rows", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    await userEvent.click(screen.getByText("Movements"));

    expect(screen.getByText("Showing latest 2 movements.")).toBeInTheDocument();
    expect(screen.getByText("Install")).toBeInTheDocument();
    expect(screen.getByText("Receive")).toBeInTheDocument();
  });

  it("shows empty movements state", async () => {
    mockListInventoryMovements.mockResolvedValueOnce([]);
    renderWithProviders();
    await screen.findByText("Brake Pad");

    await userEvent.click(screen.getByText("Movements"));

    expect(screen.getByText("Showing latest 0 movements.")).toBeInTheDocument();
    expect(screen.getByText("No movements yet.")).toBeInTheDocument();
  });

  it("shows Receive stock button only for adjust roles", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Clerk",
      lastName: "User",
      email: "clerk@example.com",
      roles: ["PartsClerk"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake Pad");
    expect(screen.getByText("Receive stock")).toBeInTheDocument();
  });

  it("hides Receive stock for non-adjust roles", async () => {
    renderWithProviders({
      userId: 3,
      firstName: "Mechanic",
      lastName: "User",
      email: "mech@example.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake Pad");
    expect(screen.queryByText("Receive stock")).not.toBeInTheDocument();
  });

  it("disables add stock action when cannot adjust", async () => {
    renderWithProviders({
      userId: 4,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@example.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await screen.findByText("Brake Pad");
    const addButtons = screen.getAllByTitle("No permission");
    expect(addButtons[0]).toBeDisabled();
  });

  it("opens adjust dialog with defaults when clicking add", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    fireEvent.click(screen.getAllByTitle("Add stock")[0]);

    await waitFor(() => {
      expect(mockAdjustProps).toHaveBeenCalledWith(
        expect.objectContaining({
          open: true,
          defaultPartId: 101,
          defaultLocationId: 1,
          canEdit: true,
        }),
      );
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();
    await screen.findByText("Brake Pad");

    fireEvent.click(screen.getByText("Back"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
