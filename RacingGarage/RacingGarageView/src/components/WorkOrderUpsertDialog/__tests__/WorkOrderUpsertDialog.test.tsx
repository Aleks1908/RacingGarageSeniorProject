import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkOrderUpsertDialog } from "../WorkOrderUpsertDialog";
import { createWorkOrder, updateWorkOrder } from "@/api/workOrders";
import { listIssueReports, linkIssueToWorkOrder } from "@/api/issueReports";

jest.mock("@/api/workOrders");
jest.mock("@/api/issueReports");

const mockCreateWorkOrder = createWorkOrder as jest.MockedFunction<
  typeof createWorkOrder
>;
const mockUpdateWorkOrder = updateWorkOrder as jest.MockedFunction<
  typeof updateWorkOrder
>;
const mockListIssueReports = listIssueReports as jest.MockedFunction<
  typeof listIssueReports
>;
const mockLinkIssueToWorkOrder = linkIssueToWorkOrder as jest.MockedFunction<
  typeof linkIssueToWorkOrder
>;

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockCars = [
  {
    id: 1,
    carNumber: "42",
    nickname: "Red Bull",
    make: "Ferrari",
    model: "488 GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 5000,
    createdAt: "2023-01-01T00:00:00Z",
  },
  {
    id: 2,
    carNumber: "43",
    nickname: "Silver Arrow",
    make: "Porsche",
    model: "911 GT3 R",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 3000,
    createdAt: "2023-01-01T00:00:00Z",
  },
];

const mockMechanics = [
  {
    id: 10,
    name: "John Doe",
    email: "john@example.com",
    isActive: true,
    createdAt: "2023-01-01T00:00:00Z",
    roles: ["Mechanic"],
  },
  {
    id: 11,
    name: "Jane Smith",
    email: "jane@example.com",
    isActive: true,
    createdAt: "2023-01-01T00:00:00Z",
    roles: ["Mechanic"],
  },
];

const mockIssues = [
  {
    id: 100,
    teamCarId: 1,
    teamCarNumber: "42",
    carSessionId: null,
    reportedByUserId: 10,
    reportedByName: "John Doe",
    linkedWorkOrderId: null,
    title: "Brake fluid leak",
    description: "Brake fluid leaking from rear brake",
    severity: "High",
    status: "Open",
    reportedAt: "2024-01-01T10:00:00Z",
    closedAt: null,
  },
  {
    id: 101,
    teamCarId: 1,
    teamCarNumber: "42",
    carSessionId: null,
    reportedByUserId: 10,
    reportedByName: "John Doe",
    linkedWorkOrderId: null,
    title: "Tire wear check",
    description: "Check tire wear on front left",
    severity: "Medium",
    status: "Open",
    reportedAt: "2024-01-02T10:00:00Z",
    closedAt: null,
  },
];

const mockWorkOrder = {
  id: 1,
  teamCarId: 1,
  teamCarNumber: "42",
  title: "Brake system inspection",
  description: "Check brake pads and rotors",
  priority: "High",
  status: "Open",
  dueDate: "2024-01-15T00:00:00Z",
  assignedToUserId: 10,
  assignedToName: "John Doe",
  createdByUserId: 10,
  createdByName: "John Doe",
  carSessionId: null,
  closedAt: null,
  createdAt: "2024-01-01T10:00:00Z",
};

describe("WorkOrderUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListIssueReports.mockResolvedValue([]);
    mockLinkIssueToWorkOrder.mockResolvedValue(undefined);
  });

  describe("Dialog rendering", () => {
    it("should render create dialog when not editing", () => {
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(
        screen.getByRole("heading", { name: "New Work Order" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Car/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    });

    it("should render edit dialog when editing", () => {
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(
        screen.getByRole("heading", { name: "Edit Work Order" })
      ).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      const { container } = render(
        <WorkOrderUpsertDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(
        container.querySelector('[role="dialog"]')
      ).not.toBeInTheDocument();
    });

    it("should close dialog on cancel", async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Form validation", () => {
    it("should show validation error when car is not selected", async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const titleInput = screen.getByPlaceholderText(/Brake inspection/i);
      await user.type(titleInput, "Test Work Order");

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Select a car/i)).toBeInTheDocument();
      });
    });

    it("should show validation error when title is empty", async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);

      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
      });
    });
  });

  describe("Creating work order", () => {
    it("should create work order with all required fields", async () => {
      const user = userEvent.setup();
      mockCreateWorkOrder.mockResolvedValue({
        ...mockWorkOrder,
        id: 999,
      });

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      const titleInput = screen.getByPlaceholderText(/Brake inspection/i);
      await user.type(titleInput, "Test Work Order");

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateWorkOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            teamCarId: 1,
            title: "Test Work Order",
            createdByUserId: 10,
            priority: "Medium",
            status: "Open",
          })
        );
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });

    it("should create work order with all optional fields", async () => {
      const user = userEvent.setup();
      mockCreateWorkOrder.mockResolvedValue({
        ...mockWorkOrder,
        id: 999,
      });

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      const titleInput = screen.getByPlaceholderText(/Brake inspection/i);
      await user.type(titleInput, "Complete Work Order");

      const descInput = screen.getByPlaceholderText(/Optional/i);
      await user.type(descInput, "Detailed description");

      const prioritySelect = screen.getByRole("combobox", {
        name: /Priority/i,
      });
      await user.click(prioritySelect);
      const highPriority = await screen.findByRole("option", { name: "High" });
      await user.click(highPriority);

      const mechanicSelect = screen.getByRole("combobox", {
        name: /Assigned mechanic/i,
      });
      await user.click(mechanicSelect);
      const mechanic = await screen.findByRole("option", {
        name: /John Doe/i,
      });
      await user.click(mechanic);

      const dueDateInput = screen.getByLabelText(/Due Date/i);
      await user.type(dueDateInput, "2024-01-20");

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateWorkOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            teamCarId: 1,
            title: "Complete Work Order",
            description: "Detailed description",
            priority: "High",
            assignedToUserId: 10,
            dueDate: expect.stringContaining("2024-01-20"),
          })
        );
      });
    });

    it("should handle create error", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      mockCreateWorkOrder.mockRejectedValue(new Error("Failed to create"));

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      const titleInput = screen.getByPlaceholderText(/Brake inspection/i);
      await user.type(titleInput, "Test");

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to create");
      });

      alertSpy.mockRestore();
    });
  });

  describe("Editing work order", () => {
    it("should populate form with existing work order data", () => {
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(
        screen.getByDisplayValue("Brake system inspection")
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Check brake pads and rotors")
      ).toBeInTheDocument();
    });

    it("should update work order with changes", async () => {
      const user = userEvent.setup();
      mockUpdateWorkOrder.mockResolvedValue(undefined);

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const titleInput = screen.getByDisplayValue("Brake system inspection");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Work Order");

      const submitButton = screen.getByRole("button", {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateWorkOrder).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: "Updated Work Order",
          })
        );
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });

    it("should set closedAt when status changes to Closed", async () => {
      const user = userEvent.setup();
      mockUpdateWorkOrder.mockResolvedValue(undefined);

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const statusSelect = screen.getByRole("combobox", { name: /Status/i });
      await user.click(statusSelect);
      const closedOption = await screen.findByRole("option", {
        name: "Closed",
      });
      await user.click(closedOption);

      const submitButton = screen.getByRole("button", {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateWorkOrder).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: "Closed",
            closedAt: expect.any(String),
          })
        );
      });
    });
  });

  describe("Locked car scenarios", () => {
    it("should lock car selection when editing", () => {
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.getByText(/#42 — Ferrari488 GT3/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: /Car/i })
      ).not.toBeInTheDocument();
    });

    it("should auto-select car when only one car is available", () => {
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={[mockCars[0]]}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.getByText(/#42 — Ferrari488 GT3/i)).toBeInTheDocument();
    });
  });

  describe("Issue linking", () => {
    it("should load issues when car is selected", async () => {
      const user = userEvent.setup();
      mockListIssueReports.mockResolvedValue(mockIssues);

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      await waitFor(() => {
        expect(mockListIssueReports).toHaveBeenCalledWith({
          teamCarId: 1,
          status: "Open",
        });
      });
    });

    it("should link issue to new work order", async () => {
      const user = userEvent.setup();
      mockListIssueReports.mockResolvedValue(mockIssues);
      mockCreateWorkOrder.mockResolvedValue({
        ...mockWorkOrder,
        id: 999,
      });

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      await waitFor(() => {
        expect(mockListIssueReports).toHaveBeenCalled();
      });

      const issueSelect = screen.getByRole("combobox", {
        name: /Link Issue/i,
      });
      await user.click(issueSelect);
      const issueOption = await screen.findByRole("option", {
        name: /#100 — Brake fluid leak/i,
      });
      await user.click(issueOption);

      const titleInput = screen.getByPlaceholderText(/Brake inspection/i);
      await user.type(titleInput, "Fix brake leak");

      const submitButton = screen.getByRole("button", {
        name: /Create Work Order/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLinkIssueToWorkOrder).toHaveBeenCalledWith(100, 999);
      });
    });

    it("should show error when loading issues fails", async () => {
      const user = userEvent.setup();
      mockListIssueReports.mockRejectedValue(new Error("Failed to load"));

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const carSelect = screen.getByRole("combobox", { name: /Car/i });
      await user.click(carSelect);
      const carOption = await screen.findByRole("option", {
        name: /#42 — Ferrari 488 GT3/i,
      });
      await user.click(carOption);

      await waitFor(
        () => {
          expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display editingLinkedIssue when provided", async () => {
      mockListIssueReports.mockResolvedValue([]);

      const linkedIssue = {
        id: 200,
        teamCarId: 1,
        teamCarNumber: "42",
        carSessionId: null,
        reportedByUserId: 10,
        reportedByName: "John Doe",
        linkedWorkOrderId: 1,
        title: "Pre-existing issue",
        description: "Pre-existing issue description",
        severity: "High",
        status: "Open",
        reportedAt: "2024-01-01T10:00:00Z",
        closedAt: null,
      };

      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          editingLinkedIssueId={200}
          editingLinkedIssue={linkedIssue}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(mockListIssueReports).toHaveBeenCalled();
      });
    });
  });

  describe("Status options", () => {
    it("should show only Open and In Progress for create mode", async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={null}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const statusSelect = screen.getByRole("combobox", {
        name: /Status/i,
      });
      await user.click(statusSelect);

      expect(
        await screen.findByRole("option", { name: "Open" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "In Progress" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: "Closed" })
      ).not.toBeInTheDocument();
    });

    it("should show all statuses including Closed for edit mode", async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderUpsertDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          editing={mockWorkOrder}
          cars={mockCars}
          mechanics={mockMechanics}
          currentUserId={10}
          onSaved={mockOnSaved}
        />
      );

      const statusSelect = screen.getByRole("combobox", { name: /Status/i });
      await user.click(statusSelect);

      expect(
        await screen.findByRole("option", { name: "Open" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "In Progress" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Closed" })
      ).toBeInTheDocument();
    });
  });
});
