import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SupplierUpsertDialog } from "../SupplierUpsertDialog";
import { createSupplier, updateSupplier } from "@/api/suppliers";

jest.mock("@/api/suppliers");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockSupplier = {
  id: 1,
  name: "Acme Parts Inc",
  contactEmail: "contact@acme.com",
  phone: "+1-555-0100",
  addressLine1: "123 Main St",
  addressLine2: "Suite 100",
  city: "New York",
  country: "USA",
  isActive: true,
  createdAt: "2025-01-01T00:00:00Z",
};

describe("SupplierUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should close dialog on cancel", () => {
    render(
      <SupplierUpsertDialog
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

  it("should render create mode", () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "New Supplier" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("should render edit mode", () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Supplier" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("should validate name is required", async () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });

    expect(createSupplier).not.toHaveBeenCalled();
  });

  it("should reject whitespace-only name", async () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });

    expect(createSupplier).not.toHaveBeenCalled();
  });

  it("should validate email format", async () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Supplier" } });

    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Enter a valid email address/i)
      ).toBeInTheDocument();
      expect(createSupplier).not.toHaveBeenCalled();
    });
  });

  it("should validate phone format", async () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Supplier" } });

    const phoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: "123" } });

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Enter a valid phone number/i)
      ).toBeInTheDocument();
    });

    expect(createSupplier).not.toHaveBeenCalled();
  });

  it("should successfully create supplier with all fields", async () => {
    (createSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Supplier" } });

    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const phoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: "+1-555-1234" } });

    const address1Input = screen.getByLabelText(/Address line 1/i);
    fireEvent.change(address1Input, { target: { value: "123 Main St" } });

    const address2Input = screen.getByLabelText(/Address line 2/i);
    fireEvent.change(address2Input, { target: { value: "Suite 100" } });

    const cityInput = screen.getByLabelText(/City/i);
    fireEvent.change(cityInput, { target: { value: "New York" } });

    const countryInput = screen.getByLabelText(/Country/i);
    fireEvent.change(countryInput, { target: { value: "USA" } });

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createSupplier).toHaveBeenCalledWith({
        name: "Test Supplier",
        contactEmail: "test@example.com",
        phone: "+1-555-1234",
        addressLine1: "123 Main St",
        addressLine2: "Suite 100",
        city: "New York",
        country: "USA",
        isActive: true,
      });
    });


    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should successfully create supplier with only required fields", async () => {
    (createSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Minimal Supplier" } });

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createSupplier).toHaveBeenCalledWith({
        name: "Minimal Supplier",
        contactEmail: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        country: "",
        isActive: true,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should successfully update supplier", async () => {
    (updateSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue("Acme Parts Inc");

    fireEvent.change(nameInput, { target: { value: "Updated Supplier" } });

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateSupplier).toHaveBeenCalledWith(1, {
        name: "Updated Supplier",
        contactEmail: "contact@acme.com",
        phone: "+1-555-0100",
        addressLine1: "123 Main St",
        addressLine2: "Suite 100",
        city: "New York",
        country: "USA",
        isActive: true,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should update supplier with isActive false", async () => {
    (updateSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const activeCheckbox = screen.getByRole("switch");
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(activeCheckbox);

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateSupplier).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          isActive: false,
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API error on create", async () => {
    (createSupplier as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Supplier" } });

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(mockOnSaved).not.toHaveBeenCalled();
  });

  it("should handle API error on update", async () => {
    (updateSupplier as jest.Mock).mockRejectedValueOnce(
      new Error("Update failed")
    );

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(mockOnSaved).not.toHaveBeenCalled();
  });

  it("should route duplicate-name backend error to name field", async () => {
    (createSupplier as jest.Mock).mockRejectedValueOnce(
      new Error("Supplier with name 'Acme' already exists.")
    );

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Acme" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(
        screen.getByText("Supplier with name 'Acme' already exists.")
      ).toBeInTheDocument();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("should disable form fields when canEdit is false", () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toBeDisabled();

    const submitButton = screen.getByRole("button", { name: "Create" });
    expect(submitButton).toBeDisabled();
  });

  it("should reset form when opening in create mode", () => {
    const { rerender } = render(
      <SupplierUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    rerender(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue("");
  });

  it("should populate form when opening in edit mode", () => {
    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue("Acme Parts Inc");

    const emailInput = screen.getByLabelText(/Email/i);
    expect(emailInput).toHaveValue("contact@acme.com");

    const phoneInput = screen.getByLabelText(/Phone/i);
    expect(phoneInput).toHaveValue("+1-555-0100");
  });

  it("should trim email on blur", async () => {
    (createSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test" } });

    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: "  test@example.com  " } });
    fireEvent.blur(emailInput);

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createSupplier).toHaveBeenCalledWith(
        expect.objectContaining({
          contactEmail: "test@example.com",
        })
      );
    });
  });

  it("should trim phone on blur", async () => {
    (createSupplier as jest.Mock).mockResolvedValueOnce({});

    render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Test" } });

    const phoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: "  +1-555-1234  " } });
    fireEvent.blur(phoneInput);

    const submitButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createSupplier).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+1-555-1234",
        })
      );
    });
  });

  it("should always show isActive switch regardless of editing state", () => {
    const { rerender } = render(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    rerender(
      <SupplierUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSupplier}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
