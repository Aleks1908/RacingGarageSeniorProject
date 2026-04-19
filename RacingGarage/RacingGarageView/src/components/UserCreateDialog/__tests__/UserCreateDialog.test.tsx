import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCreateDialog } from "../UserCreateDialog";
import { createUser } from "@/api/users";

jest.mock("@/api/users", () => ({
  createUser: jest.fn(),
}));

const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;

describe("UserCreateDialog", () => {
  const mockOnSaved = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUser.mockResolvedValue({
      id: 1,
      name: "New User",
      email: "new@example.com",
      isActive: true,
      roles: ["Mechanic"],
      createdAt: new Date().toISOString(),
    });
  });

  it("should render dialog when open", () => {
    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Create user" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <UserCreateDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.queryByText("Create user")).not.toBeInTheDocument();
  });

  it("should show validation error for empty name", async () => {
    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required.")).toBeInTheDocument();
    });
  });

  it("should show validation error for invalid email", async () => {
    const user = userEvent.setup();

    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "invalid-email");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email.")).toBeInTheDocument();
    });
  });

  it("should show validation error for short password", async () => {
    const user = userEvent.setup();

    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "12345");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be 6+ chars.")
      ).toBeInTheDocument();
    });
  });

  it("should call createUser and callbacks on successful submit", async () => {
    const user = userEvent.setup();

    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "Mechanic",
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockRejectedValueOnce(new Error("User already exists"));

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("User already exists");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("should reset form when opened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    await user.type(nameInput, "Test Name");

    expect(nameInput.value).toBe("Test Name");

    rerender(
      <UserCreateDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    rerender(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const newNameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(newNameInput.value).toBe("");
  });

  it("should close dialog when Cancel button is clicked", () => {
    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should disable form during submission", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <UserCreateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});
