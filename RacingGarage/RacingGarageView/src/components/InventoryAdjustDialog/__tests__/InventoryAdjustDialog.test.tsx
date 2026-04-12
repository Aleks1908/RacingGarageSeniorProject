import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventoryAdjustDialog } from "../InventoryAdjustDialog";
import { adjustInventoryStock } from "@/api/inventoryStock";
import { listWorkOrders } from "@/api/workOrders";

jest.mock("@/api/inventoryStock");
jest.mock("@/api/workOrders");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockStock = {
  id: 1,
  partId: 1,
  inventoryLocationId: 1,
  quantity: 10,
  partName: "Brake Pads",
  partSku: "BP-001",
  locationCode: "A1",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockParts = [
  {
    id: 1,
    sku: "BP-001",
    name: "Brake Pads",
    category: "Brakes",
    unitCost: 100,
    reorderPoint: 5,
    supplierId: 1,
    supplierName: "ABC Parts",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    currentStock: 15,
    needsReorder: false,
  },
  {
    id: 2,
    sku: "OIL-001",
    name: "Engine Oil",
    category: "Fluids",
    unitCost: 50,
    reorderPoint: 3,
    supplierId: 1,
    supplierName: "ABC Parts",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    currentStock: 8,
    needsReorder: false,
  },
];

const mockLocations = [
  {
    id: 1,
    code: "A1",
    name: "Shelf A",
    description: "Main storage",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    code: "B1",
    name: "Shelf B",
    description: "Secondary storage",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockWorkOrders = [
  {
    id: 1,
    title: "Service Work Order",
    status: "Open",
    priority: "Medium",
    teamCarId: 1,
    assignedUserId: 1,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    title: "Repair Work Order",
    status: "In Progress",
    priority: "High",
    teamCarId: 2,
    assignedUserId: 2,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

describe("InventoryAdjustDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listWorkOrders as jest.Mock).mockResolvedValue(mockWorkOrders);
  });

  describe("Adjust existing stock", () => {
    it("should render adjust dialog with stock", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Adjust: Brake Pads \(BP-001\) @ A1/)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/Current qty:/)).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should close dialog on cancel", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cancel" })
        ).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("should adjust stock quantity successfully", async () => {
      (adjustInventoryStock as jest.Mock).mockResolvedValue({});

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "5");

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adjustInventoryStock).toHaveBeenCalledWith(
          expect.objectContaining({
            partId: 1,
            inventoryLocationId: 1,
            quantityChange: 5,
            reason: "Adjustment",
          })
        );
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });

    it("should validate quantity change is required", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Apply adjustment" })
        ).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/quantity change is required/i)
        ).toBeInTheDocument();
      });

      expect(adjustInventoryStock).not.toHaveBeenCalled();
    });

    it("should validate quantity cannot be zero", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "0");

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot be 0/i)).toBeInTheDocument();
      });
    });

    it("should handle negative quantity adjustment", async () => {
      (adjustInventoryStock as jest.Mock).mockResolvedValue({});

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "-3");

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adjustInventoryStock).toHaveBeenCalledWith(
          expect.objectContaining({
            quantityChange: -3,
          })
        );
      });
    });

    it("should handle API error on adjustment", async () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      (adjustInventoryStock as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "5");

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Network error");
      });

      expect(mockOnOpenChange).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it("should show permission message when canEdit is false", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={false}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should include optional reason and notes", async () => {
      (adjustInventoryStock as jest.Mock).mockResolvedValue({});

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "5");

      const reasonInput = screen.getByPlaceholderText(
        /Adjustment \/ Receive \/ Audit/i
      );
      await userEvent.clear(reasonInput);
      await userEvent.type(reasonInput, "Stock audit");

      const notesInput = screen.getByPlaceholderText(/Optional notes/i);
      await userEvent.type(notesInput, "Found extra parts");

      const submitButton = screen.getByRole("button", {
        name: "Apply adjustment",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adjustInventoryStock).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: "Stock audit",
            notes: "Found extra parts",
          })
        );
      });
    });

    it("should handle work order loading error", async () => {
      (listWorkOrders as jest.Mock).mockRejectedValue(
        new Error("Failed to load")
      );

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should validate quantity must be integer", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={mockStock}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 5 or -2/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 5 or -2/);
      expect(qtyInput).toHaveAttribute("type", "number");
      expect(qtyInput).toHaveAttribute("step", "1");
    });
  });

  describe("Receive new stock", () => {
    it("should render receive dialog without stock", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Receive \/ Add stock/)).toBeInTheDocument();
      });
    });

    it("should receive stock with selected part and location", async () => {
      (adjustInventoryStock as jest.Mock).mockResolvedValue({});

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 10/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 10/);
      await userEvent.type(qtyInput, "15");

      const submitButton = screen.getByRole("button", {
        name: /Receive \/ add stock/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/select a part/i)).toBeInTheDocument();
      });
    });

    it("should use defaultPartId when provided", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultPartId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("BP-001 — Brake Pads")).toBeInTheDocument();
      });
    });

    it("should use defaultLocationId when provided", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultLocationId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("A1 — Shelf A")).toBeInTheDocument();
      });
    });

    it("should show error when parts or locations are missing", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/To receive stock, the dialog needs both/)
        ).toBeInTheDocument();
      });
    });

    it("should validate location selection is required in receive mode", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultPartId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 10/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 10/);
      await userEvent.type(qtyInput, "15");

      const submitButton = screen.getByRole("button", {
        name: /Receive \/ add stock/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/select a location/i)).toBeInTheDocument();
      });
    });

    it("should receive stock with both part and location defaults", async () => {
      (adjustInventoryStock as jest.Mock).mockResolvedValue({});

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultPartId={1}
          defaultLocationId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("BP-001 — Brake Pads")).toBeInTheDocument();
        expect(screen.getByText("A1 — Shelf A")).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 10/);
      await userEvent.type(qtyInput, "20");

      const submitButton = screen.getByRole("button", {
        name: /Receive \/ add stock/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adjustInventoryStock).toHaveBeenCalledWith(
          expect.objectContaining({
            partId: 1,
            inventoryLocationId: 1,
            quantityChange: 20,
            reason: "Receive",
          })
        );
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSaved).toHaveBeenCalled();
    });

    it("should validate quantity in receive mode", async () => {
      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultPartId={1}
          defaultLocationId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 10/)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /Receive \/ add stock/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity is required/i)).toBeInTheDocument();
      });
    });

    it("should handle API error in receive mode", async () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      (adjustInventoryStock as jest.Mock).mockRejectedValue(
        new Error("Stock adjustment failed")
      );

      render(
        <InventoryAdjustDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          stock={null}
          parts={mockParts}
          locations={mockLocations}
          defaultPartId={1}
          defaultLocationId={1}
          canEdit={true}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g. 10/)).toBeInTheDocument();
      });

      const qtyInput = screen.getByPlaceholderText(/e.g. 10/);
      await userEvent.type(qtyInput, "10");

      const submitButton = screen.getByRole("button", {
        name: /Receive \/ add stock/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Stock adjustment failed");
      });

      alertSpy.mockRestore();
    });
  });

  it("should not render when closed", () => {
    const { container } = render(
      <InventoryAdjustDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        stock={mockStock}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
