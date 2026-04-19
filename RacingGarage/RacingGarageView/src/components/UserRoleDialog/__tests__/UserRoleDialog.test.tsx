import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserRoleDialog } from "../UserRoleDialog";
import { setUserRole } from "@/api/users";
import type { UserRead } from "@/api/users/types";

jest.mock("@/api/users", () => ({
  setUserRole: jest.fn(),
}));

const mockSetUserRole = setUserRole as jest.MockedFunction<typeof setUserRole>;

describe("UserRoleDialog", () => {
  const mockOnSaved = jest.fn();
  const mockOnOpenChange = jest.fn();

  const mockUser: UserRead = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    isActive: true,
    roles: ["Mechanic"],
    createdAt: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetUserRole.mockResolvedValue(undefined);
  });

  it("should render dialog when open with user", () => {
    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Change role: John Doe")).toBeInTheDocument();
    expect(screen.getByText(/Current role:/)).toBeInTheDocument();
    const mechanicElements = screen.getAllByText("Mechanic");
    expect(mechanicElements.length).toBeGreaterThan(0);
  });

  it("should show 'No user selected' when user is null", () => {
    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("No user selected.")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <UserRoleDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.queryByText("Change role: John Doe")).not.toBeInTheDocument();
  });

  it("should initialize form with current user role", () => {
    const userWithManagerRole: UserRead = {
      ...mockUser,
      roles: ["Manager"],
    };

    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={userWithManagerRole}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getAllByText("Manager").length).toBeGreaterThan(0);
  });

  it("should call setUserRole and callbacks on successful submit", async () => {
    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save role/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetUserRole).toHaveBeenCalledWith(1, {
        role: "Mechanic",
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    mockSetUserRole.mockRejectedValueOnce(new Error("Permission denied"));

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save role/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Permission denied");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("should close dialog when Cancel button is clicked", () => {
    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should disable form during submission", async () => {
    mockSetUserRole.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save role/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it("should handle user with no roles", () => {
    const userWithNoRoles: UserRead = {
      ...mockUser,
      roles: [],
    };

    render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={userWithNoRoles}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText(/Current role:/)).toBeInTheDocument();
  });

  it("should not submit when user is null", async () => {
    const { rerender } = render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSaved={mockOnSaved}
      />,
    );

    rerender(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSaved={mockOnSaved}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /save role/i }),
    ).not.toBeInTheDocument();
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("should reset form when user changes", () => {
    const user1: UserRead = {
      ...mockUser,
      id: 1,
      firstName: "User",
      lastName: "One",
      roles: ["Mechanic"],
    };

    const user2: UserRead = {
      ...mockUser,
      id: 2,
      firstName: "User",
      lastName: "Two",
      roles: ["Manager"],
    };

    const { rerender } = render(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={user1}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Change role: User One")).toBeInTheDocument();

    rerender(
      <UserRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        user={user2}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Change role: User Two")).toBeInTheDocument();
  });
});
