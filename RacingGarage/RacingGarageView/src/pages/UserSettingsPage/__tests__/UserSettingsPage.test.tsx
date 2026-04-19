import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import UserSettingsPage from "../UserSettingsPage";
import { createMockJwt } from "@/test-utils";
import * as usersApi from "@/api/users";
import type { AuthRefreshResponse } from "@/api/users/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/users");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockUpdateUser = usersApi.updateUser as jest.MockedFunction<
  typeof usersApi.updateUser
>;
const mockChangeUserPassword =
  usersApi.changeUserPassword as jest.MockedFunction<
    typeof usersApi.changeUserPassword
  >;

const mockAuthResponse: AuthRefreshResponse = {
  token: "new-token",
  user: {
    id: 1,
    firstName: "Updated",
    lastName: "Manager",
    email: "updated@test.com",
    roles: ["Manager"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
};

function renderWithProviders(userOverride?: TestUser | null) {
  const defaultUser: TestUser = {
    userId: 1,
    firstName: "Test",
    lastName: "Manager",
    email: "manager@test.com",
    roles: ["Manager"],
    expiresAtUtc: "2026-12-31T23:59:59Z",
  };

  localStorage.clear();

  if (userOverride !== null) {
    localStorage.setItem("accessToken", createMockJwt("Test Manager"));
    localStorage.setItem("user", JSON.stringify(userOverride || defaultUser));
  }

  return render(
    <MemoryRouter>
      <AuthProvider>
        <UserSettingsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("UserSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    window.alert = jest.fn();
  });

  it("renders page title and subtitle", () => {
    renderWithProviders();

    expect(screen.getByText("User Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your profile and password"),
    ).toBeInTheDocument();
  });

  it("shows message when user is not logged in", () => {
    renderWithProviders(null);

    expect(screen.getByText("You must be logged in.")).toBeInTheDocument();
  });

  it("displays profile section", () => {
    renderWithProviders();

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Update your name\/email. Requires your current password./,
      ),
    ).toBeInTheDocument();
  });

  it("displays password section", () => {
    renderWithProviders();

    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(
      screen.getByText(/Change your password. Requires your current password./),
    ).toBeInTheDocument();
  });

  it("pre-fills name and email from user data", () => {
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(
      /first name/i,
    ) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(
      /last name/i,
    ) as HTMLInputElement;
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;

    expect(firstNameInput.value).toBe("Test");
    expect(lastNameInput.value).toBe("Manager");
    expect(emailInput.value).toBe("manager@test.com");
  });

  it("disables Save profile button when no changes", () => {
    renderWithProviders();

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables Save profile button when name is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables Save profile button when email is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, " ");

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables Save profile button when password is not provided", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, " Updated");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables Save profile button when valid changes and password provided", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, " Updated");

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    expect(saveButton).toBeEnabled();
  });

  it("updates profile successfully", async () => {
    mockUpdateUser.mockResolvedValue(mockAuthResponse);
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Updated");

    const lastNameInput = screen.getByLabelText(/last name/i);
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Manager");

    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, "updated@test.com");

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        firstName: "Updated",
        lastName: "Manager",
        email: "updated@test.com",
        oldPassword: "password123",
      });
      expect(window.alert).toHaveBeenCalledWith("Profile updated.");
    });
  });

  it("shows alert on profile update failure", async () => {
    const errorMessage = "Invalid password";
    mockUpdateUser.mockRejectedValue(new Error(errorMessage));
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, " Updated");

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "wrong");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("clears password field after successful profile update", async () => {
    mockUpdateUser.mockResolvedValue(mockAuthResponse);
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, " Updated");

    const passwordInput = screen.getByPlaceholderText(
      "Required to save",
    ) as HTMLInputElement;
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(passwordInput.value).toBe("");
    });
  });

  it("disables Change password button initially", () => {
    renderWithProviders();

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });
    expect(changeButton).toBeDisabled();
  });

  it("shows error when old password is missing", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    await waitFor(() => {
      expect(
        screen.getByText("Enter your current password."),
      ).toBeInTheDocument();
    });
  });

  it("shows error when new password is missing", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    await waitFor(() => {
      expect(screen.getByText("Enter a new password.")).toBeInTheDocument();
    });
  });

  it("shows error when new password is too short", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "short");

    await waitFor(() => {
      expect(
        screen.getByText("New password must be at least 6 characters."),
      ).toBeInTheDocument();
    });
  });

  it("shows error when confirm password is missing", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    await waitFor(() => {
      expect(
        screen.getByText("Confirm your new password."),
      ).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "different123");

    await waitFor(() => {
      expect(
        screen.getByText("New passwords do not match."),
      ).toBeInTheDocument();
    });
  });

  it("enables Change password button when all fields are valid", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "newpass123");

    await waitFor(() => {
      const changeButton = screen.getByRole("button", {
        name: /change password/i,
      });
      expect(changeButton).toBeEnabled();
    });
  });

  it("changes password successfully", async () => {
    mockChangeUserPassword.mockResolvedValue(mockAuthResponse);
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "newpass123");

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });
    await user.click(changeButton);

    await waitFor(() => {
      expect(mockChangeUserPassword).toHaveBeenCalledWith({
        oldPassword: "oldpass123",
        newPassword: "newpass123",
      });
      expect(window.alert).toHaveBeenCalledWith("Password updated.");
    });
  });

  it("shows alert on password change failure", async () => {
    const errorMessage = "Current password is incorrect";
    mockChangeUserPassword.mockRejectedValue(new Error(errorMessage));
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "wrongpass");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "newpass123");

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });
    await user.click(changeButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("clears password fields after successful password change", async () => {
    mockChangeUserPassword.mockResolvedValue(mockAuthResponse);
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText(
      "Current password",
    ) as HTMLInputElement;
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText(
      "New password",
    ) as HTMLInputElement;
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText(
      "Confirm new password",
    ) as HTMLInputElement;
    await user.type(confirmPasswordInput, "newpass123");

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });
    await user.click(changeButton);

    await waitFor(() => {
      expect(oldPasswordInput.value).toBe("");
      expect(newPasswordInput.value).toBe("");
      expect(confirmPasswordInput.value).toBe("");
    });
  });

  it("shows saving state for profile update", async () => {
    mockUpdateUser.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockAuthResponse), 100),
        ),
    );
    const user = userEvent.setup();
    renderWithProviders();

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, " Updated");

    const passwordInput = screen.getByPlaceholderText("Required to save");
    await user.type(passwordInput, "password123");

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    await user.click(saveButton);

    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Save profile")).toBeInTheDocument();
    });
  });

  it("shows saving state for password change", async () => {
    mockChangeUserPassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockAuthResponse), 100),
        ),
    );
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "newpass123");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "newpass123");

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });
    await user.click(changeButton);

    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Change password")).toBeInTheDocument();
    });
  });

  it("navigates back on Back click", async () => {
    renderWithProviders();

    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows alert when trying to change password with validation errors", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const oldPasswordInput = screen.getByPlaceholderText("Current password");
    await user.type(oldPasswordInput, "oldpass123");

    const newPasswordInput = screen.getByLabelText("New password");
    await user.type(newPasswordInput, "short");

    const confirmPasswordInput = screen.getByLabelText("Confirm new password");
    await user.type(confirmPasswordInput, "short");

    const changeButton = screen.getByRole("button", {
      name: /change password/i,
    });

    expect(changeButton).toBeDisabled();
  });
});
