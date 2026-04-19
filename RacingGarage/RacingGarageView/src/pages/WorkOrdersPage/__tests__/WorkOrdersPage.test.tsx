import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import WorkOrdersPage from "../WorkOrdersPage";
import { createMockJwt } from "@/test-utils";
import * as workOrdersApi from "@/api/workOrders";
import * as carsApi from "@/api/teamCars";
import * as usersApi from "@/api/users";
import type { WorkOrderRead } from "@/api/shared/types";
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

jest.mock("@/api/workOrders");
jest.mock("@/api/teamCars");
jest.mock("@/api/users");
jest.mock("@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog", () => ({
  WorkOrderUpsertDialog: () => (
    <div data-testid="work-order-dialog">Dialog</div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListWorkOrders = workOrdersApi.listWorkOrders as jest.MockedFunction<
  typeof workOrdersApi.listWorkOrders
>;
const mockDeleteWorkOrder =
  workOrdersApi.deleteWorkOrder as jest.MockedFunction<
    typeof workOrdersApi.deleteWorkOrder
  >;
const mockListTeamCars = carsApi.listTeamCars as jest.MockedFunction<
  typeof carsApi.listTeamCars
>;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<
  typeof usersApi.listUsers
>;

const mockWorkOrders: WorkOrderRead[] = [
  {
    id: 101,
    title: "Replace brake pads",
    description: "Front and rear brake pads need replacement",
    teamCarId: 1,
    teamCarNumber: "42",
    priority: "High",
    status: "Open",
    assignedToUserId: 10,
    assignedToName: "John Mechanic",
    createdAt: "2024-02-01T08:00:00Z",
    createdByUserId: 1,
    createdByName: "Manager User",
    carSessionId: 10,
    dueDate: "2024-02-05T08:00:00Z",
    closedAt: null,
  },
  {
    id: 102,
    title: "Engine oil change",
    description: "Regular maintenance oil change",
    teamCarId: 2,
    teamCarNumber: "7",
    priority: "Medium",
    status: "In Progress",
    assignedToUserId: 11,
    assignedToName: "Jane Mechanic",
    createdAt: "2024-02-02T09:00:00Z",
    createdByUserId: 2,
    createdByName: "Manager User",
    carSessionId: null,
    dueDate: null,
    closedAt: null,
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

const mockUsers: UserRead[] = [
  {
    id: 10,
    firstName: "John",
    lastName: "Mechanic",
    email: "john@test.com",
    isActive: true,
    roles: ["Mechanic"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 11,
    firstName: "Jane",
    lastName: "Mechanic",
    email: "jane@test.com",
    isActive: true,
    roles: ["Mechanic"],
    createdAt: "2024-01-02T00:00:00Z",
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
        <WorkOrdersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("WorkOrdersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockListWorkOrders.mockResolvedValue(mockWorkOrders);
    mockListTeamCars.mockResolvedValue(mockCars);
    mockListUsers.mockResolvedValue(mockUsers);
  });

  it("renders page title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(
      screen.getByText("Create, assign, and track work orders"),
    ).toBeInTheDocument();
  });

  it("loads work orders, cars, and users on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalled();
      expect(mockListTeamCars).toHaveBeenCalled();
      expect(mockListUsers).toHaveBeenCalled();
    });
  });

  it("displays work order count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("2 work orders")).toBeInTheDocument();
    });
  });

  it("displays work orders in table", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
      expect(screen.getByText("Engine oil change")).toBeInTheDocument();
    });
  });

  it("displays work order details in table rows", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("101")).toBeInTheDocument();
      expect(screen.getByText("#42")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("John Mechanic")).toBeInTheDocument();
    });
  });

  it("shows empty state when no work orders", async () => {
    mockListWorkOrders.mockResolvedValue([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No work orders found.")).toBeInTheDocument();
    });
  });

  it("shows New Work Order button for Manager", async () => {
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
        screen.getByRole("button", { name: /new work order/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows New Work Order button for Mechanic", async () => {
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
        screen.getByRole("button", { name: /new work order/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides New Work Order button for Driver", async () => {
    renderWithProviders({
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      const buttons = screen.queryAllByRole("button", {
        name: /new work order/i,
      });
      expect(buttons.length).toBe(0);
    });
  });

  it("filters work orders by car", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const carSelect = screen.getAllByRole("combobox")[0];
    await user.click(carSelect);

    const option = await screen.findByRole("option", { name: /#42/ });
    await user.click(option);

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          teamCarId: 1,
          status: undefined,
          priority: undefined,
        }),
      );
    });
  });

  it("filters work orders by status", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[1];
    await user.click(statusSelect);

    const option = await screen.findByRole("option", { name: "Open" });
    await user.click(option);

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          teamCarId: undefined,
          status: "Open",
          priority: undefined,
        }),
      );
    });
  });

  it("filters work orders by priority", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const prioritySelect = selects[2];
    await user.click(prioritySelect);

    const option = await screen.findByRole("option", { name: "High" });
    await user.click(option);

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          teamCarId: undefined,
          status: undefined,
          priority: "High",
        }),
      );
    });
  });

  it("refreshes work orders on Refresh click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockListWorkOrders).toHaveBeenCalledTimes(2);
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates to work order details on row click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const titleCell = screen.getByText("Replace brake pads");
    await user.click(titleCell);

    expect(mockNavigate).toHaveBeenCalledWith("/work-orders/101");
  });

  it("navigates to work order details on arrow button click", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    const arrowButtons = within(firstDataRow).getAllByRole("button");
    const firstButton = arrowButtons[0];

    await user.click(firstButton);

    expect(mockNavigate).toHaveBeenCalledWith("/work-orders/101");
  });

  it("deletes work order with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    const buttons = within(firstDataRow).getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];

    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete work order #101?");
      expect(mockDeleteWorkOrder).toHaveBeenCalledWith(101);
    });
  });

  it("cancels delete when confirmation is declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    const buttons = within(firstDataRow).getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];

    await user.click(deleteButton);

    expect(mockDeleteWorkOrder).not.toHaveBeenCalled();
  });

  it("shows alert on delete failure", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    const errorMessage = "Cannot delete work order";
    mockDeleteWorkOrder.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    const buttons = within(firstDataRow).getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];

    await user.click(deleteButton);

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
      expect(screen.getByText("Replace brake pads")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    const buttons = within(firstDataRow).getAllByRole("button");

    const editButton = buttons[1];
    const deleteButton = buttons[2];

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });
});
