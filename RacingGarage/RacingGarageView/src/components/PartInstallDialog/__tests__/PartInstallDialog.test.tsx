import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartInstallDialog } from "../PartInstallDialog";
import { createPartInstallation } from "@/api/partInstallations";

jest.mock("@/api/partInstallations");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockStockRows = [
  {
    id: 1,
    partId: 1,
    partName: "Brake Pads",
    partSku: "BP-001",
    inventoryLocationId: 1,
    locationCode: "A1",
    quantity: 10,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    partId: 2,
    partName: "Oil Filter",
    partSku: "OF-002",
    inventoryLocationId: 2,
    locationCode: "B2",
    quantity: 5,
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

describe("PartInstallDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  it("should render install dialog", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: /Add Installed Part/i })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
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
      <PartInstallDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should disable form fields when canEdit is false", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeDisabled();

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    expect(quantityInput).toBeDisabled();

    const notesInput = screen.getByPlaceholderText(/Optional notes/i);
    expect(notesInput).toBeDisabled();

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    expect(submitButton).toBeDisabled();
  });

  it("should have stock rows available in select", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeInTheDocument();
    expect(selectTrigger).not.toBeDisabled();
  });

  it("should have quantity field", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    expect(quantityInput).toBeInTheDocument();
    expect(quantityInput).not.toBeDisabled();
  });

  it("should have notes field", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const notesInput = screen.getByPlaceholderText(/Optional notes/i);
    expect(notesInput).toBeInTheDocument();
    expect(notesInput).not.toBeDisabled();
  });

  it("should display Add part button", () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it("should validate stock row is required", async () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "2" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Select a stock row/i)).toBeInTheDocument();
    });

    expect(createPartInstallation).not.toHaveBeenCalled();
  });

  it("should validate quantity is required", async () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Quantity is required/i)).toBeInTheDocument();
    });

    expect(createPartInstallation).not.toHaveBeenCalled();
  });

  it("should validate quantity must be positive integer", async () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "-5" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Quantity must be a positive integer/i)
      ).toBeInTheDocument();
    });

    expect(createPartInstallation).not.toHaveBeenCalled();
  });

  it("should validate quantity does not exceed available stock", async () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "15" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Not enough stock/i)).toBeInTheDocument();
    });

    expect(createPartInstallation).not.toHaveBeenCalled();
  });

  it("should successfully install part", async () => {
    (createPartInstallation as jest.Mock).mockResolvedValueOnce({});

    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "2" } });

    const notesInput = screen.getByPlaceholderText(/Optional notes/i);
    fireEvent.change(notesInput, { target: { value: "Test notes" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createPartInstallation).toHaveBeenCalledWith({
        workOrderId: 1,
        partId: 1,
        inventoryLocationId: 1,
        quantity: 2,
        notes: "Test notes",
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API error", async () => {
    (createPartInstallation as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "2" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Network error");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(mockOnSaved).not.toHaveBeenCalled();
  });

  it("should reset form when dialog opens", async () => {
    const { rerender } = render(
      <PartInstallDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    rerender(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    expect(quantityInput).toHaveValue("");

    const notesInput = screen.getByPlaceholderText(/Optional notes/i);
    expect(notesInput).toHaveValue("");
  });

  it("should validate decimal quantity", async () => {
    render(
      <PartInstallDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workOrderId={1}
        stockRows={mockStockRows}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Brake Pads/);
      fireEvent.click(options[1]);
    });

    const quantityInput = screen.getByPlaceholderText(/e.g. 1/i);
    fireEvent.change(quantityInput, { target: { value: "2.5" } });

    const submitButton = screen.getByRole("button", { name: /Add part/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Quantity must be a positive integer/i)
      ).toBeInTheDocument();
    });

    expect(createPartInstallation).not.toHaveBeenCalled();
  });
});
