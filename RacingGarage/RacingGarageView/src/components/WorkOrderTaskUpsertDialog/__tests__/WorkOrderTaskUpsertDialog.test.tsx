import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkOrderTaskUpsertDialog } from "../WorkOrderTaskUpsertDialog";
import { createWorkOrderTask, updateWorkOrderTask } from "@/api/workOrderTasks";

jest.mock("@/api/workOrderTasks");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

describe("WorkOrderTaskUpsertDialog", () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture =
      Element.prototype.hasPointerCapture || (() => false);
    Element.prototype.setPointerCapture =
      Element.prototype.setPointerCapture || (() => {});
    Element.prototype.releasePointerCapture =
      Element.prototype.releasePointerCapture || (() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  it("should render create dialog when not editing", () => {
    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Add Task" })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should not render when closed", () => {
    const { container } = render(
      <WorkOrderTaskUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should require a non-empty trimmed title", async () => {
    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Replace brake pads"), {
      target: { value: "   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    });

    expect(createWorkOrderTask).not.toHaveBeenCalled();
  });

  it("should create a task with default status and empty estimated minutes", async () => {
    (createWorkOrderTask as jest.Mock).mockResolvedValueOnce({});

    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Replace brake pads"), {
      target: { value: " Front pad swap " },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional"), {
      target: { value: "High priority" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 45"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

    await waitFor(() => {
      expect(createWorkOrderTask).toHaveBeenCalledWith({
        workOrderId: 1,
        title: "Front pad swap",
        description: "High priority",
        status: "Todo",
        sortOrder: 0,
        estimatedMinutes: null,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should create a task with status Done and numeric estimated minutes", async () => {
    const user = userEvent.setup();
    (createWorkOrderTask as jest.Mock).mockResolvedValueOnce({});

    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Replace brake pads"), {
      target: { value: "Replace rotor" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional"), {
      target: { value: "Left front" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 45"), {
      target: { value: "60" },
    });

    const statusSelect = screen.getByRole("combobox");
    await user.click(statusSelect);
    await user.click(screen.getByRole("option", { name: "Done" }));

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

    await waitFor(() => {
      expect(createWorkOrderTask).toHaveBeenCalledWith({
        workOrderId: 1,
        title: "Replace rotor",
        description: "Left front",
        status: "Done",
        sortOrder: 0,
        estimatedMinutes: 60,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should show validation when estimated minutes is invalid", async () => {
    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Replace brake pads"), {
      target: { value: "Torque check" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 45"), {
      target: { value: "-5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

    await waitFor(() => {
      expect(
        screen.getByText("Estimated minutes must be a non-negative integer.")
      ).toBeInTheDocument();
    });

    expect(createWorkOrderTask).not.toHaveBeenCalled();
  });

  it("should update a task and set completedAt when status is Done", async () => {
    const user = userEvent.setup();
    (updateWorkOrderTask as jest.Mock).mockResolvedValueOnce({});

    const editingTask = {
      id: 10,
      workOrderId: 2,
      title: "Bleed brakes",
      description: "",
      status: "Todo",
      sortOrder: 0,
      estimatedMinutes: 30,
      completedAt: null,
    };

    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={editingTask}
        workOrderId={2}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Replace brake pads"), {
      target: { value: "Bleed brakes and refill" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional"), {
      target: { value: "Use DOT 4" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 45"), {
      target: { value: "40" },
    });

    const statusSelect = screen.getByRole("combobox");
    await user.click(statusSelect);
    await user.click(screen.getByRole("option", { name: "Done" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Task" }));

    await waitFor(() => {
      expect(updateWorkOrderTask).toHaveBeenCalledWith(
        editingTask.id,
        expect.objectContaining({
          title: "Bleed brakes and refill",
          description: "Use DOT 4",
          status: "Done",
          estimatedMinutes: 40,
          completedAt: expect.any(String),
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should keep controls disabled and show permission warning when canEdit is false", () => {
    render(
      <WorkOrderTaskUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        workOrderId={1}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByRole("button", { name: "Add Task" })).toBeDisabled();
    expect(
      screen.getByText("You don’t have permission to manage tasks.")
    ).toBeInTheDocument();
  });
});
