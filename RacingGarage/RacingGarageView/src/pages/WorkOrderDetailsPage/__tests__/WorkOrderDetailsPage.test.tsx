import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { WorkOrderDetailsPage } from "../WorkOrderDetailsPage";
import { createMockJwt } from "@/test-utils";
import * as workOrdersApi from "@/api/workOrders";
import * as carsApi from "@/api/teamCars";
import * as usersApi from "@/api/users";
import * as tasksApi from "@/api/workOrderTasks";
import * as laborLogsApi from "@/api/laborLogs";
import * as partInstallationsApi from "@/api/partInstallations";
import * as inventoryStockApi from "@/api/inventoryStock";
import type { WorkOrderDetails } from "@/api/workOrders/types";
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
jest.mock("@/api/workOrderTasks");
jest.mock("@/api/laborLogs");
jest.mock("@/api/partInstallations");
jest.mock("@/api/inventoryStock");

jest.mock("@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog", () => ({
  WorkOrderUpsertDialog: ({ onSaved }: { onSaved: () => void }) => (
    <div data-testid="work-order-dialog">
      <button onClick={onSaved}>Save</button>
    </div>
  ),
}));
jest.mock(
  "@/components/WorkOrderTaskUpsertDialog/WorkOrderTaskUpsertDialog",
  () => ({
    WorkOrderTaskUpsertDialog: ({ onSaved }: { onSaved: () => void }) => (
      <div data-testid="task-dialog">
        <button onClick={onSaved}>Save</button>
      </div>
    ),
  }),
);
jest.mock("@/components/LaborLogUpsertDialog/LaborLogUpsertDialog", () => ({
  LaborLogUpsertDialog: ({
    onSaved,
    onOpenChange,
  }: {
    onSaved: () => void;
    onOpenChange: (v: boolean) => void;
  }) => (
    <div data-testid="labor-dialog">
      <button onClick={onSaved}>Save Labor</button>
      <button onClick={() => onOpenChange(false)}>Close Labor</button>
    </div>
  ),
}));
jest.mock("@/components/PartInstallDialog/PartInstallDialog", () => ({
  PartInstallDialog: ({
    onSaved,
    onOpenChange,
  }: {
    onSaved: () => void;
    onOpenChange: (v: boolean) => void;
  }) => (
    <div data-testid="part-dialog">
      <button onClick={onSaved}>Save Part</button>
      <button onClick={() => onOpenChange(false)}>Close Part</button>
    </div>
  ),
}));

const mockGetWorkOrderDetails =
  workOrdersApi.getWorkOrderDetails as jest.MockedFunction<
    typeof workOrdersApi.getWorkOrderDetails
  >;
const mockUpdateWorkOrder =
  workOrdersApi.updateWorkOrder as jest.MockedFunction<
    typeof workOrdersApi.updateWorkOrder
  >;
const mockGetTeamCar = carsApi.getTeamCar as jest.MockedFunction<
  typeof carsApi.getTeamCar
>;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<
  typeof usersApi.listUsers
>;
const mockDeleteWorkOrderTask =
  tasksApi.deleteWorkOrderTask as jest.MockedFunction<
    typeof tasksApi.deleteWorkOrderTask
  >;
const mockDeleteLaborLog = laborLogsApi.deleteLaborLog as jest.MockedFunction<
  typeof laborLogsApi.deleteLaborLog
>;
const mockDeletePartInstallation =
  partInstallationsApi.deletePartInstallation as jest.MockedFunction<
    typeof partInstallationsApi.deletePartInstallation
  >;
const mockListInventoryStock =
  inventoryStockApi.listInventoryStock as jest.MockedFunction<
    typeof inventoryStockApi.listInventoryStock
  >;

const mockWorkOrderDetails: WorkOrderDetails = {
  workOrder: {
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
  tasks: [
    {
      id: 201,
      workOrderId: 101,
      title: "Remove old pads",
      description: "Remove front and rear brake pads",
      status: "Todo",
      estimatedMinutes: 30,
      completedAt: null,
      sortOrder: 1,
    },
    {
      id: 202,
      workOrderId: 101,
      title: "Install new pads",
      description: "Install new brake pads",
      status: "Done",
      estimatedMinutes: 45,
      completedAt: "2024-02-01T10:00:00Z",
      sortOrder: 2,
    },
  ],
  laborLogs: [
    {
      id: 301,
      workOrderTaskId: 201,
      mechanicUserId: 10,
      mechanicName: "John Mechanic",
      minutes: 60,
      logDate: "2024-02-01T08:00:00Z",
      comment: "Removed old brake pads",
    },
  ],
  partInstallations: [
    {
      id: 401,
      workOrderId: 101,
      partId: 1001,
      partName: "Brake Pad Set",
      partSku: "BPS-001",
      quantity: 2,
      inventoryLocationId: 1,
      locationCode: "MAIN",
      installedAt: "2024-02-01T09:00:00Z",
      installedByUserId: 10,
      installedByName: "John Mechanic",
      notes: "Front and rear pads",
    },
  ],
  totalLaborMinutes: 60,
  totalInstalledPartsQty: 2,
  linkedIssue: {
    id: 5,
    title: "Brake noise detected",
    description: "Grinding sound when braking",
    teamCarId: 1,
    teamCarNumber: "42",
    carSessionId: 10,
    severity: "High",
    status: "Open",
    reportedAt: "2024-01-30T10:00:00Z",
    reportedByUserId: 5,
    reportedByName: "John Driver",
    linkedWorkOrderId: 101,
    closedAt: null,
  },
};

const mockCar: TeamCarRead = {
  id: 1,
  carNumber: "42",
  nickname: "Red Lightning",
  make: "Ferrari",
  model: "488 GT3",
  year: 2023,
  carClass: "GT3",
  status: "Active",
  odometerKm: 5000,
  createdAt: "2024-01-01T00:00:00Z",
};

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
];

function renderWithProviders(
  workOrderId: string = "101",
  userOverride?: TestUser,
) {
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
    <MemoryRouter initialEntries={[`/work-orders/${workOrderId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/work-orders/:id" element={<WorkOrderDetailsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("WorkOrderDetailsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkOrderDetails.mockResolvedValue(mockWorkOrderDetails);
    mockGetTeamCar.mockResolvedValue(mockCar);
    mockListUsers.mockResolvedValue(mockUsers);
    mockListInventoryStock.mockResolvedValue([]);
  });

  it("shows loading state initially", () => {
    renderWithProviders();

    expect(screen.getByText("Loading details...")).toBeInTheDocument();
  });

  it("loads and displays work order details", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    expect(screen.getByText("Open • High")).toBeInTheDocument();
  });

  it("displays work order description", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByText("Front and rear brake pads need replacement"),
      ).toBeInTheDocument();
    });
  });

  it("displays car information", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByText("#42 Ferrari 488 GT3 (2023)"),
      ).toBeInTheDocument();
    });
  });

  it("displays car nickname", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Red Lightning/)).toBeInTheDocument();
    });
  });

  it("displays linked issue information", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/#5 - Brake noise detected/)).toBeInTheDocument();
    });
  });

  it("displays summary counts", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const allText = screen.getByText(/60 min/);
    expect(allText).toBeInTheDocument();
  });

  it("displays tasks in tasks tab", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
      expect(screen.getByText("Install new pads")).toBeInTheDocument();
    });
  });

  it("displays labor logs in labor tab", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    await waitFor(() => {
      expect(screen.getByText("Removed old brake pads")).toBeInTheDocument();
    });
  });

  it("displays parts in parts tab", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Brake Pad Set")).toBeInTheDocument();
      expect(screen.getByText(/BPS-001/)).toBeInTheDocument();
    });
  });

  it("shows Add task button for Manager", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add task/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides management buttons for non-Manager/Mechanic users", async () => {
    renderWithProviders("101", {
      userId: 3,
      firstName: "Driver",
      lastName: "User",
      email: "driver@test.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add task/i }),
    ).not.toBeInTheDocument();
  });

  it("updates status via quick select", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];
    await user.click(statusSelect);

    const closedOption = await screen.findByRole("option", { name: "Closed" });
    await user.click(closedOption);

    await waitFor(() => {
      expect(mockUpdateWorkOrder).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          status: "Closed",
        }),
      );
    });
  });

  it("deletes task with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete task/i,
    });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete this task?");
      expect(mockDeleteWorkOrderTask).toHaveBeenCalledWith(201);
    });
  });

  it("cancels task delete when confirmation declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete task/i,
    });
    await user.click(deleteButtons[0]);

    expect(mockDeleteWorkOrderTask).not.toHaveBeenCalled();
  });

  it("deletes labor log with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    await waitFor(() => {
      expect(screen.getByText("Removed old brake pads")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", {
      name: /delete labor log/i,
    });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete this labor log?");
      expect(mockDeleteLaborLog).toHaveBeenCalledWith(301);
    });
  });

  it("deletes part installation with confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Front and rear pads")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", {
      name: /delete installed part/i,
    });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeletePartInstallation).toHaveBeenCalledWith(401);
    });
  });

  it("shows error when work order fails to load", async () => {
    const errorMessage = "Work order not found";
    mockGetWorkOrderDetails.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("shows error for invalid work order id", async () => {
    renderWithProviders("invalid");

    await waitFor(() => {
      expect(screen.getByText("Invalid work order id.")).toBeInTheDocument();
    });
  });

  it("displays empty state for no tasks", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      tasks: [],
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    });
  });

  it("displays empty state for no labor logs", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      laborLogs: [],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    await waitFor(() => {
      expect(screen.getByText("No labor logs yet.")).toBeInTheDocument();
    });
  });

  it("displays empty state for no parts", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      partInstallations: [],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("No parts installed yet.")).toBeInTheDocument();
    });
  });

  it("shows created by and assigned to information", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Manager User")).toBeInTheDocument();
      expect(screen.getByText("John Mechanic")).toBeInTheDocument();
    });
  });

  it("handles work order without linked issue", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      linkedIssue: null,
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Linked issue/)).not.toBeInTheDocument();
  });

  it("handles car loading error", async () => {
    mockGetTeamCar.mockRejectedValue(new Error("Failed to load car"));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car: Failed to load car")).toBeInTheDocument();
    });
  });

  it("handles car without nickname", async () => {
    mockGetTeamCar.mockResolvedValue({
      ...mockCar,
      nickname: null as unknown as string,
    });

    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByText("#42 Ferrari 488 GT3 (2023)"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Nickname:/)).not.toBeInTheDocument();
  });

  it("handles work order without description", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      workOrder: {
        ...mockWorkOrderDetails.workOrder,
        description: null as unknown as string,
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("opens edit dialog when Edit button clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalled();
    });
  });

  it("disables Edit button when dependencies fail to load", async () => {
    mockListUsers.mockRejectedValue(new Error("Users load failed"));

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Edit is unavailable: Users load failed/),
      ).toBeInTheDocument();
    });

    expect(editButton).toBeDisabled();
  });

  it("opens add task dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByTestId("task-dialog")).toBeInTheDocument();
  });

  it("opens add labor dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    const addButton = await screen.findByRole("button", { name: /add labor/i });
    await user.click(addButton);

    expect(screen.getByTestId("labor-dialog")).toBeInTheDocument();
  });

  it("disables add labor button when no tasks exist", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      tasks: [],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    const addButton = await screen.findByRole("button", {
      name: /create a task first/i,
    });
    expect(addButton).toBeDisabled();
  });

  it("opens add part dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockListInventoryStock).toHaveBeenCalled();
    });
  });

  it("handles inventory stock loading error", async () => {
    mockListInventoryStock.mockRejectedValue(new Error("Failed to load stock"));

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to load stock")).toBeInTheDocument();
    });
  });

  it("handles delete task error", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    mockDeleteWorkOrderTask.mockRejectedValue(
      new Error("Failed to delete task"),
    );

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete task/i,
    });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete task");
    });
  });

  it("handles delete labor log error", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    mockDeleteLaborLog.mockRejectedValue(
      new Error("Failed to delete labor log"),
    );

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    await waitFor(() => {
      expect(screen.getByText("Removed old brake pads")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", {
      name: /delete labor log/i,
    });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete labor log");
    });
  });

  it("handles delete part installation error", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    mockDeletePartInstallation.mockRejectedValue(
      new Error("Failed to delete part installation"),
    );

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Front and rear pads")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", {
      name: /delete installed part/i,
    });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Failed to delete part installation",
      );
    });
  });

  it("handles status update error", async () => {
    window.alert = jest.fn();
    mockUpdateWorkOrder.mockRejectedValue(new Error("Failed to update status"));

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];
    await user.click(statusSelect);

    const closedOption = await screen.findByRole("option", { name: "Closed" });
    await user.click(closedOption);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to update status");
    });
  });

  it("prevents duplicate status update", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];
    await user.click(statusSelect);

    const openOption = await screen.findByRole("option", { name: "Open" });
    await user.click(openOption);

    expect(mockUpdateWorkOrder).not.toHaveBeenCalled();
  });

  it("sets closedAt when status changed to Closed", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];
    await user.click(statusSelect);

    const closedOption = await screen.findByRole("option", { name: "Closed" });
    await user.click(closedOption);

    await waitFor(() => {
      expect(mockUpdateWorkOrder).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          status: "Closed",
          closedAt: expect.any(String),
        }),
      );
    });
  });

  it("displays task with null description", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      tasks: [
        {
          id: 203,
          workOrderId: 101,
          title: "Task without description",
          description: null as unknown as string,
          status: "Todo",
          estimatedMinutes: null,
          completedAt: null,
          sortOrder: 1,
        },
      ],
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Task without description")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Estimated:/)).not.toBeInTheDocument();
  });

  it("displays labor log with null comment", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      laborLogs: [
        {
          id: 302,
          workOrderTaskId: 201,
          mechanicUserId: 10,
          mechanicName: "Sarah Mechanic",
          minutes: 30,
          logDate: "2024-02-01T08:00:00Z",
          comment: null as unknown as string,
        },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    await waitFor(() => {
      expect(screen.getByText("Sarah Mechanic")).toBeInTheDocument();
      expect(screen.getByText(/30 min/)).toBeInTheDocument();
    });
  });

  it("displays part installation with null notes", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      partInstallations: [
        {
          id: 402,
          workOrderId: 101,
          partId: 1001,
          partName: "Brake Pad Set",
          partSku: "BPS-002",
          quantity: 1,
          inventoryLocationId: 1,
          locationCode: "MAIN",
          installedAt: "2024-02-01T09:00:00Z",
          installedByUserId: 10,
          installedByName: "John Mechanic",
          notes: null as unknown as string,
        },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Brake Pad Set")).toBeInTheDocument();
      expect(screen.getByText(/BPS-002/)).toBeInTheDocument();
    });
  });

  it("displays assigned to as Unassigned when null", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      workOrder: {
        ...mockWorkOrderDetails.workOrder,
        assignedToUserId: null,
        assignedToName: null,
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });
  });

  it("navigates back when Back button clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);
  });

  it("disables add part button while loading stock", async () => {
    mockListInventoryStock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
    );

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    expect(addButton).toBeDisabled();
  });

  it("displays part with null installedByName", async () => {
    mockGetWorkOrderDetails.mockResolvedValue({
      ...mockWorkOrderDetails,
      partInstallations: [
        {
          id: 403,
          workOrderId: 101,
          partId: 1001,
          partName: "Brake Pad Set",
          partSku: "BPS-003",
          quantity: 1,
          inventoryLocationId: 1,
          locationCode: "MAIN",
          installedAt: "2024-02-01T09:00:00Z",
          installedByUserId: null,
          installedByName: null,
          notes: null as unknown as string,
        },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Brake Pad Set")).toBeInTheDocument();
    });

    const badges = screen.getAllByText("—");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("cancels part delete when confirmation declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Remove old pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    await waitFor(() => {
      expect(screen.getByText("Front and rear pads")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", {
      name: /delete installed part/i,
    });
    await user.click(deleteButton);

    expect(mockDeletePartInstallation).not.toHaveBeenCalled();
  });

  it("renders WorkOrderUpsertDialog when edit is opened", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId("work-order-dialog")).toBeInTheDocument();
    });
  });

  it("renders WorkOrderTaskUpsertDialog when task creation opened", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add task/i });
    await user.click(addButton);

    expect(screen.getByTestId("task-dialog")).toBeInTheDocument();
  });

  it("renders LaborLogUpsertDialog when labor creation opened", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    const addButton = await screen.findByRole("button", { name: /add labor/i });
    await user.click(addButton);

    expect(screen.getByTestId("labor-dialog")).toBeInTheDocument();
  });

  it("renders PartInstallDialog when part installation opened", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId("part-dialog")).toBeInTheDocument();
    });
  });

  it("calls loadDetails when task dialog saved", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add task/i });
    await user.click(addButton);

    const taskDialog = screen.getByTestId("task-dialog");
    const saveButton = taskDialog.querySelector("button");
    if (saveButton) {
      await user.click(saveButton);
    }

    await waitFor(() => {
      expect(mockGetWorkOrderDetails).toHaveBeenCalledTimes(2);
    });
  });

  it("calls loadDetails when labor dialog saved and resets state", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    const addButton = await screen.findByRole("button", { name: /add labor/i });
    await user.click(addButton);

    const saveButton = screen.getByRole("button", { name: /save labor/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetWorkOrderDetails).toHaveBeenCalledTimes(2);
    });
  });

  it("resets labor state when dialog closed via onOpenChange", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const laborTab = screen.getByRole("tab", { name: /labor/i });
    await user.click(laborTab);

    const addButton = await screen.findByRole("button", { name: /add labor/i });
    await user.click(addButton);

    const closeButton = screen.getByRole("button", { name: /close labor/i });
    await user.click(closeButton);

    expect(mockGetWorkOrderDetails).toHaveBeenCalledTimes(1);
  });

  it("calls loadDetails when part dialog saved", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId("part-dialog")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save part/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockGetWorkOrderDetails).toHaveBeenCalledTimes(2);
    });
  });

  it("resets stock error when part dialog closed via onOpenChange", async () => {
    mockListInventoryStock.mockRejectedValue(new Error("Failed to load stock"));

    const user = userEvent.setup();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("#101 Replace brake pads")).toBeInTheDocument();
    });

    const partsTab = screen.getByRole("tab", { name: /parts/i });
    await user.click(partsTab);

    const addButton = await screen.findByRole("button", { name: /add part/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to load stock")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /close part/i });
    await user.click(closeButton);

    expect(screen.queryByText("Failed to load stock")).not.toBeInTheDocument();
  });
});
