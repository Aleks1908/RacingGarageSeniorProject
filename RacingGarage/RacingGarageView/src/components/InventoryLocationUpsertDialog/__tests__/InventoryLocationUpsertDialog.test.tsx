import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventoryLocationUpsertDialog } from "../InventoryLocationUpsertDialog";
import {
  createInventoryLocation,
  updateInventoryLocation,
} from "@/api/inventoryLocations";

jest.mock("@/api/inventoryLocations");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockLocation = {
  id: 1,
  name: "Main Shelf A",
  code: "A1",
  description: "Primary storage",
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("InventoryLocationUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render create dialog when not editing", () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "New Inventory Location" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Location" })
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLocation}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Location #1" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should populate form fields when editing", () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLocation}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByDisplayValue("Main Shelf A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Primary storage")).toBeInTheDocument();
  });

  it("should validate name is required", async () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("should validate code is required", async () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Main Shelf A/i);
    await userEvent.type(nameInput, "Test Location");

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/code is required/i)).toBeInTheDocument();
    });
  });

  it("should create new location successfully", async () => {
    (createInventoryLocation as jest.Mock).mockResolvedValue({ id: 2 });

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Main Shelf A/i);
    await userEvent.type(nameInput, "New Location");

    const codeInput = screen.getByPlaceholderText(/e.g. A1/i);
    await userEvent.type(codeInput, "b2");

    const descInput = screen.getByPlaceholderText(/Optional/i);
    await userEvent.type(descInput, "Test description");

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createInventoryLocation).toHaveBeenCalledWith({
        name: "New Location",
        code: "B2",
        description: "Test description",
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should update existing location successfully", async () => {
    (updateInventoryLocation as jest.Mock).mockResolvedValue({});

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLocation}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByDisplayValue("Main Shelf A");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Location");

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateInventoryLocation).toHaveBeenCalledWith(1, {
        name: "Updated Location",
        code: "A1",
        description: "Primary storage",
        isActive: true,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should convert code to uppercase", async () => {
    (createInventoryLocation as jest.Mock).mockResolvedValue({ id: 2 });

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Main Shelf A/i);
    await userEvent.type(nameInput, "Test");

    const codeInput = screen.getByPlaceholderText(/e.g. A1/i);
    await userEvent.type(codeInput, "abc123");

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createInventoryLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "ABC123",
        })
      );
    });
  });

  it("should handle API error on create", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    (createInventoryLocation as jest.Mock).mockRejectedValue(
      new Error("Location code already exists")
    );

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Main Shelf A/i);
    await userEvent.type(nameInput, "Test");

    const codeInput = screen.getByPlaceholderText(/e.g. A1/i);
    await userEvent.type(codeInput, "A1");

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Location code already exists");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("should handle API error on update", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    (updateInventoryLocation as jest.Mock).mockRejectedValue(
      new Error("Update failed")
    );

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLocation}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByDisplayValue("Main Shelf A");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated");

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed");
    });

    alertSpy.mockRestore();
  });

  it("should show permission message when editing without canEdit", async () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockLocation}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should not show permission message when creating without canEdit", () => {
    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.queryByText(/you don't have permission/i)
    ).not.toBeInTheDocument();
  });

  it("should handle isActive toggle", async () => {
    (createInventoryLocation as jest.Mock).mockResolvedValue({ id: 2 });

    render(
      <InventoryLocationUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Main Shelf A/i);
    await userEvent.type(nameInput, "Test");

    const codeInput = screen.getByPlaceholderText(/e.g. A1/i);
    await userEvent.type(codeInput, "T1");

    const submitButton = screen.getByRole("button", {
      name: "Create Location",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createInventoryLocation).toHaveBeenCalled();
    });
  });

  it("should not render when closed", () => {
    const { container } = render(
      <InventoryLocationUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
