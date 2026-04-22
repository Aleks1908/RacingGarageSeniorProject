import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartsUpsertDialog } from "../PartsUpsertDialog";
import { createPart, updatePart } from "@/api/parts";
import type { PartRead } from "@/api/parts/types";

jest.mock("@/api/parts");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();
const mockCreatePart = createPart as jest.MockedFunction<typeof createPart>;
const mockUpdatePart = updatePart as jest.MockedFunction<typeof updatePart>;

const mockSuppliers = [
  {
    id: 1,
    name: "Supplier A",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Supplier B",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Inactive Supplier",
    isActive: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockPart: PartRead = {
  id: 1,
  name: "Brake Pads",
  sku: "BP-001",
  category: "Brakes",
  unitCost: 199.99,
  reorderPoint: 5,
  supplierId: 1,
  supplierName: "Supplier A",
  currentStock: 10,
  needsReorder: false,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("PartsUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render create dialog when not editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "New Part" }),
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Edit Part (ID 1)" }),
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should not render when closed", () => {
    const { container } = render(
      <PartsUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should populate form fields when editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByLabelText("Name", { exact: false })).toHaveValue("Brake Pads");
    expect(screen.getByLabelText("Sku", { exact: false })).toHaveValue("BP-001");
    expect(screen.getByLabelText("Category", { exact: false })).toHaveValue("Brakes");
    expect(screen.getByLabelText("Unit cost")).toHaveValue(199.99);
    expect(screen.getByLabelText("Reorder point")).toHaveValue(5);
  });

  it("should always show active switch regardless of editing state", () => {
    const { rerender } = render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();

    rerender(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should show message when no active suppliers available", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={[
          {
            id: 3,
            name: "Inactive Supplier",
            isActive: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ]}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent ===
          "You need to create an active supplier before you can create parts.",
      ),
    ).toBeInTheDocument();
  });

  it("should disable submit button when no active suppliers", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={[]}
        onSaved={mockOnSaved}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Create part" });
    expect(submitButton).toBeDisabled();
  });

  it("should show supplier select trigger", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should validate required name field", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should validate required sku field", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should validate required category field", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should validate required supplier field", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should convert sku to uppercase on blur", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    const skuInput = screen.getByLabelText("Sku", { exact: false });
    fireEvent.change(skuInput, { target: { value: "test-001" } });
    fireEvent.blur(skuInput);

    expect(skuInput).toHaveValue("TEST-001");
  });

  it("should have all required form fields", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByLabelText("Name", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Sku", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Category", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Unit cost")).toBeInTheDocument();
    expect(screen.getByLabelText("Reorder point")).toBeInTheDocument();
    expect(screen.getByLabelText("Supplier", { exact: false })).toBeInTheDocument();
  });

  it("should successfully update an existing part", async () => {
    mockUpdatePart.mockResolvedValue(undefined);

    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Updated Part" },
    });

    const submitButton = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePart).toHaveBeenCalledWith(1, {
        name: "Updated Part",
        sku: "BP-001",
        category: "Brakes",
        unitCost: 199.99,
        reorderPoint: 5,
        supplierId: 1,
        isActive: true,
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("should have unit cost and reorder point fields with numeric input", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    const unitCostInput = screen.getByLabelText("Unit cost");
    const reorderInput = screen.getByLabelText("Reorder point");

    expect(unitCostInput).toHaveAttribute("type", "number");
    expect(reorderInput).toHaveAttribute("type", "number");
  });

  it("should show Create part button when not editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Create part" }),
    ).toBeInTheDocument();
  });

  it("should show Save changes button when editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("should toggle isActive switch when editing", () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockPart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    const activeSwitch = screen.getByRole("switch");
    expect(activeSwitch).toBeChecked();

    fireEvent.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
  });

  it("should validate negative unit cost", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText("Unit cost"), {
      target: { value: "-10" },
    });
    fireEvent.change(screen.getByLabelText("Reorder point"), {
      target: { value: "5" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should validate negative reorder point", async () => {
    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText("Unit cost"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Reorder point"), {
      target: { value: "-5" },
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).not.toHaveBeenCalled();
    });
  });

  it("should successfully create a new part", async () => {
    mockCreatePart.mockResolvedValue({
      id: 2,
      name: "New Part",
      sku: "NEW-001",
      category: "New Category",
      unitCost: 150.0,
      reorderPoint: 10,
      supplierId: 1,
      supplierName: "Supplier A",
      currentStock: 0,
      needsReorder: true,
      isActive: true,
      createdAt: "2024-01-02T00:00:00Z",
    });

    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "New Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "new-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "New Category" },
    });
    fireEvent.change(screen.getByLabelText("Unit cost"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText("Reorder point"), {
      target: { value: "10" },
    });

    const supplierTrigger = screen.getByRole("combobox");
    fireEvent.click(supplierTrigger);

    await waitFor(() => {
      const supplierOptions = screen.getAllByText("Supplier A");
      const supplierOption = supplierOptions[1];
      fireEvent.click(supplierOption);
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).toHaveBeenCalledWith({
        name: "New Part",
        sku: "NEW-001",
        category: "New Category",
        unitCost: 150,
        reorderPoint: 10,
        supplierId: 1,
        isActive: true,
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("should handle save error with alert", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    mockCreatePart.mockRejectedValue(new Error("Network error"));

    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Test Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText("Unit cost"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Reorder point"), {
      target: { value: "5" },
    });

    const supplierTrigger = screen.getByRole("combobox");
    fireEvent.click(supplierTrigger);

    await waitFor(() => {
      const supplierOptions = screen.getAllByText("Supplier A");
      const supplierOption = supplierOptions[1];
      fireEvent.click(supplierOption);
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Network error");
    });

    alertSpy.mockRestore();
  });

  it("should update part with isActive false", async () => {
    mockUpdatePart.mockResolvedValue(undefined);

    const inactivePart = { ...mockPart, isActive: false };

    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={inactivePart}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePart).toHaveBeenCalledWith(1, {
        name: "Brake Pads",
        sku: "BP-001",
        category: "Brakes",
        unitCost: 199.99,
        reorderPoint: 5,
        supplierId: 1,
        isActive: false,
      });
    });
  });

  it("should handle default values for unit cost and reorder point", async () => {
    mockCreatePart.mockResolvedValue({
      id: 3,
      name: "Simple Part",
      sku: "SIMPLE-001",
      category: "Simple",
      unitCost: 0,
      reorderPoint: 0,
      supplierId: 1,
      supplierName: "Supplier A",
      currentStock: 0,
      needsReorder: false,
      isActive: true,
      createdAt: "2024-01-03T00:00:00Z",
    });

    render(
      <PartsUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        suppliers={mockSuppliers}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name", { exact: false }), {
      target: { value: "Simple Part" },
    });
    fireEvent.change(screen.getByLabelText("Sku", { exact: false }), {
      target: { value: "simple-001" },
    });
    fireEvent.change(screen.getByLabelText("Category", { exact: false }), {
      target: { value: "Simple" },
    });

    const supplierTrigger = screen.getByRole("combobox");
    fireEvent.click(supplierTrigger);

    await waitFor(() => {
      const supplierOptions = screen.getAllByText("Supplier A");
      const supplierOption = supplierOptions[1];
      fireEvent.click(supplierOption);
    });

    const submitButton = screen.getByRole("button", { name: "Create part" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePart).toHaveBeenCalledWith({
        name: "Simple Part",
        sku: "SIMPLE-001",
        category: "Simple",
        unitCost: 0,
        reorderPoint: 0,
        supplierId: 1,
        isActive: true,
      });
    });
  });
});
