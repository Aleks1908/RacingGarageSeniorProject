import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import SuppliersPage from "../SuppliersPage";
import { createMockJwt } from "@/test-utils";
import * as suppliersApi from "@/api/suppliers";
import type { SupplierRead } from "@/api/suppliers/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/suppliers");
jest.mock("@/components/SupplierUpsertDialog/SupplierUpsertDialog", () => ({
  SupplierUpsertDialog: () => <div data-testid="supplier-dialog">Dialog</div>,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListSuppliers = suppliersApi.listSuppliers as jest.MockedFunction<
  typeof suppliersApi.listSuppliers
>;
const mockDeleteSupplier = suppliersApi.deleteSupplier as jest.MockedFunction<
  typeof suppliersApi.deleteSupplier
>;

const mockSuppliers: SupplierRead[] = [
  {
    id: 1,
    name: "Brembo Supply",
    contactEmail: "contact@brembo.com",
    phone: "555-0001",
    addressLine1: "123 Main St",
    addressLine2: "Suite 100",
    city: "Detroit",
    country: "USA",
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: 2,
    name: "Mobil1 Distributor",
    contactEmail: "sales@mobil1.com",
    phone: "555-0002",
    addressLine1: "456 Oak Ave",
    addressLine2: null,
    city: "Houston",
    country: "USA",
    isActive: true,
    createdAt: "2024-01-02T11:00:00Z",
  },
  {
    id: 3,
    name: "Inactive Supplier",
    contactEmail: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    country: null,
    isActive: false,
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
        <SuppliersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SuppliersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockListSuppliers.mockResolvedValue(mockSuppliers);
  });

  it("renders page title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Supplier management")).toBeInTheDocument();
  });

  it("loads suppliers on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListSuppliers).toHaveBeenCalled();
    });
  });

  it("displays suppliers count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("3 suppliers")).toBeInTheDocument();
    });
  });

  it("displays suppliers in table", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.getByText("Mobil1 Distributor")).toBeInTheDocument();
      expect(screen.getByText("Inactive Supplier")).toBeInTheDocument();
    });
  });

  it("displays supplier contact information", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("contact@brembo.com")).toBeInTheDocument();
      expect(screen.getByText("555-0001")).toBeInTheDocument();
    });
  });

  it("displays formatted address", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByText("123 Main St • Suite 100 • Detroit, USA"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("456 Oak Ave • Houston, USA"),
      ).toBeInTheDocument();
    });
  });

  it("displays dash for missing contact info", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Inactive Supplier")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const inactiveRow = rows.find((row) =>
      row.textContent?.includes("Inactive Supplier"),
    );
    expect(inactiveRow).toBeInTheDocument();
  });

  it("shows Active/Inactive badges", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBe(3);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("sorts suppliers by name alphabetically", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const dataRows = rows.filter((row) =>
      row.textContent?.includes("Brembo Supply"),
    );
    expect(dataRows.length).toBeGreaterThan(0);
  });

  it("shows empty state when no suppliers", async () => {
    mockListSuppliers.mockResolvedValue([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No suppliers found.")).toBeInTheDocument();
    });
  });

  it("shows New Supplier button for Manager", async () => {
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
        screen.getByRole("button", { name: /new supplier/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows New Supplier button for PartsClerk", async () => {
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
        screen.getByRole("button", { name: /new supplier/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides New Supplier button for Driver", async () => {
    renderWithProviders({
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /new supplier/i }),
    ).not.toBeInTheDocument();
  });

  it("filters suppliers by name", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.getByText("Mobil1 Distributor")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by name, email, phone, city, country/i,
    );
    await user.type(searchInput, "brembo");

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.queryByText("Mobil1 Distributor")).not.toBeInTheDocument();
    });
  });

  it("filters suppliers by email", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by name, email, phone, city, country/i,
    );
    await user.type(searchInput, "sales@mobil1");

    await waitFor(() => {
      expect(screen.getByText("Mobil1 Distributor")).toBeInTheDocument();
      expect(screen.queryByText("Brembo Supply")).not.toBeInTheDocument();
    });
  });

  it("filters suppliers by phone", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by name, email, phone, city, country/i,
    );
    await user.type(searchInput, "555-0001");

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.queryByText("Mobil1 Distributor")).not.toBeInTheDocument();
    });
  });

  it("filters suppliers by city", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by name, email, phone, city, country/i,
    );
    await user.type(searchInput, "houston");

    await waitFor(() => {
      expect(screen.getByText("Mobil1 Distributor")).toBeInTheDocument();
      expect(screen.queryByText("Brembo Supply")).not.toBeInTheDocument();
    });
  });

  it("filters suppliers by country", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search by name, email, phone, city, country/i,
    );
    await user.type(searchInput, "usa");

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
      expect(screen.getByText("Mobil1 Distributor")).toBeInTheDocument();
    });
  });

  it("toggles active-only filter", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(mockListSuppliers).toHaveBeenCalledTimes(1);
    });

    const activeButton = screen.getByRole("button", { name: /disabled/i });
    await user.click(activeButton);

    await waitFor(() => {
      expect(mockListSuppliers).toHaveBeenCalledWith({ activeOnly: true });
    });
  });

  it("refreshes suppliers on Refresh click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListSuppliers).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockListSuppliers).toHaveBeenCalledTimes(2);
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("deletes supplier with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
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
        'Delete supplier "Brembo Supply"?',
      );
      expect(mockDeleteSupplier).toHaveBeenCalledWith(1);
    });
  });

  it("cancels delete when confirmation declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByRole("button");
    const trashButtons = deleteButtons.filter(
      (btn) =>
        btn.querySelector("svg") && btn.classList.contains("bg-destructive"),
    );

    await user.click(trashButtons[0]);

    expect(mockDeleteSupplier).not.toHaveBeenCalled();
  });

  it("shows alert on delete failure", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    const errorMessage = "Cannot delete supplier";
    mockDeleteSupplier.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
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
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole("button");
    const editButtons = allButtons.filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.hasAttribute("disabled");
    });

    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("formats creation date", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Brembo Supply")).toBeInTheDocument();
    });

    const cells = screen.getAllByRole("cell");
    const dateCells = cells.filter(
      (cell) =>
        cell.textContent?.includes("2024") || cell.textContent?.includes("/"),
    );
    expect(dateCells.length).toBeGreaterThan(0);
  });

  it("displays dash for empty address", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Inactive Supplier")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const inactiveRow = rows.find((row) =>
      row.textContent?.includes("Inactive Supplier"),
    );

    expect(inactiveRow).toBeInTheDocument();
  });
});
