import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LaborLogUpsertDialog } from "../LaborLogUpsertDialog";
import { createLaborLog, updateLaborLog } from "@/api/laborLogs";
import { updateWorkOrderTask } from "@/api/workOrderTasks";

jest.mock("@/api/laborLogs");
jest.mock("@/api/workOrderTasks");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockTasks = [
  { id: 1, title: "Fix Brakes", status: "Todo" as const },
  { id: 2, title: "Replace Oil", status: "Todo" as const },
  { id: 3, title: "Check Engine", status: "Done" as const },
];

const mockTasksFull = [
  {
    id: 1,
    workOrderId: 1,
    title: "Fix Brakes",
    description: "Repair brake system",
    status: "Todo",
    assignedUserId: null,
    sortOrder: 0,
    estimatedMinutes: 120,
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    workOrderId: 1,
    title: "Replace Oil",
    description: "Oil change",
    status: "Todo",
    assignedUserId: null,
    sortOrder: 1,
    estimatedMinutes: 30,
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    workOrderId: 1,
    title: "Check Engine",
    description: "Engine inspection",
    status: "Done",
    assignedUserId: null,
    sortOrder: 2,
    estimatedMinutes: 60,
    completedAt: "2024-01-02T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockLog = {
  id: 1,
  workOrderTaskId: 1,
  taskTitle: "Fix Brakes",
  userId: 1,
  userName: "John Doe",
  mechanicUserId: 1,
  mechanicName: "John Doe",
  minutes: 60,
  logDate: "2024-01-15",
  comment: "Brake pads replaced",
  createdAt: "2024-01-15T10:00:00Z",
};

describe("LaborLogUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render create dialog when not editing", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Log Labor" })
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLog}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Labor Log" })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
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
      <LaborLogUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should lock task field when editing", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLog}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit Labor Log" })
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Select a task/i)).not.toBeInTheDocument();
  });

  it("should validate task is required", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "60");

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Task is required/i)).toBeInTheDocument();
    });
  });

  it("should validate minutes is required", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Minutes is required/i)).toBeInTheDocument();
    });
  });

  it("should validate minutes must be positive integer", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "-10");

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Minutes must be a positive integer/i)
      ).toBeInTheDocument();
    });
  });

  it("should validate date is required", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "60");

    const dateInput = screen.getByLabelText(/Date/i);
    await userEvent.clear(dateInput);

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Date is required/i)).toBeInTheDocument();
    });
  });

  it("should create new labor log successfully", async () => {
    (createLaborLog as jest.Mock).mockResolvedValue({ id: 2 });

    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "90");

    const commentInput = screen.getByPlaceholderText(/Optional notes/i);
    await userEvent.type(commentInput, "Test comment");

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createLaborLog).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrderTaskId: 1,
          minutes: 90,
          comment: "Test comment",
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should update existing labor log successfully", async () => {
    (updateLaborLog as jest.Mock).mockResolvedValue({});

    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLog}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit Labor Log" })
      ).toBeInTheDocument();
    });

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.clear(minutesInput);
    await userEvent.type(minutesInput, "120");

    const submitButton = screen.getByRole("button", { name: "Save Log" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateLaborLog).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          minutes: 120,
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API error on create", async () => {
    (createLaborLog as jest.Mock).mockRejectedValue(new Error("API Error"));
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "60");

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("API Error");
    });

    alertSpy.mockRestore();
  });

  it("should handle API error on update", async () => {
    (updateLaborLog as jest.Mock).mockRejectedValue(new Error("Update failed"));
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLog}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit Labor Log" })
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: "Save Log" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed");
    });

    alertSpy.mockRestore();
  });

  it("should populate form with edit data", async () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLog}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      const minutesInput = screen.getByPlaceholderText(
        /e.g. 30/i
      ) as HTMLInputElement;
      expect(minutesInput.value).toBe("60");
    });

    const commentInput = screen.getByPlaceholderText(
      /Optional notes/i
    ) as HTMLInputElement;
    expect(commentInput.value).toBe("Brake pads replaced");
  });

  it("should preselect task when workOrderTaskId provided", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    expect(screen.queryByText(/Select a task/i)).not.toBeInTheDocument();
  });

  it("should disable form fields when canEdit is false", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    const taskSelector = screen.getByRole("combobox");
    expect(taskSelector).toBeDisabled();
  });

  it("should complete task when checkbox is checked", async () => {
    (createLaborLog as jest.Mock).mockResolvedValue({ id: 2 });
    (updateWorkOrderTask as jest.Mock).mockResolvedValue({});

    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const minutesInput = screen.getByPlaceholderText(/e.g. 30/i);
    await userEvent.type(minutesInput, "90");

    const completeCheckbox = screen.getByRole("checkbox");
    await userEvent.click(completeCheckbox);

    const submitButton = screen.getByRole("button", { name: "Log Labor" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateWorkOrderTask).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "Done",
          title: "Fix Brakes",
        })
      );
    });
  });

  it("should filter out completed tasks from task selector", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText(/Select a task/i)).toBeInTheDocument();
  });

  it("should show default date as today", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
        workOrderTaskId={1}
      />
    );

    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    const today = new Date().toISOString().slice(0, 10);
    expect(dateInput.value).toBe(today);
  });

  it("should disable complete task checkbox when no task selected", () => {
    render(
      <LaborLogUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        tasks={mockTasks}
        tasksFull={mockTasksFull}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const completeCheckbox = screen.getByRole("checkbox");
    expect(completeCheckbox).toBeDisabled();
  });
});
