import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { UsersPage } from "../UsersPage";
import { createMockJwt } from "@/test-utils";
import * as usersApi from "@/api/users";
import type { UserRead } from "@/api/users/types";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("@/api/users");
jest.mock("@/components/UserCreateDialog/UserCreateDialog", () => ({
  UserCreateDialog: ({
    open,
    onSaved,
  }: {
    open: boolean;
    onSaved: () => void;
  }) =>
    open ? (
      <div data-testid="user-create-dialog">
        <button onClick={onSaved}>Save User</button>
      </div>
    ) : null,
}));
jest.mock("@/components/UserRoleDialog/UserRoleDialog", () => ({
  UserRoleDialog: ({
    open,
    user,
    onSaved,
  }: {
    open: boolean;
    user: { firstName: string; lastName: string } | null;
    onSaved: () => void;
  }) =>
    open && user ? (
      <div data-testid="user-role-dialog">
        User: {user.firstName} {user.lastName}
        <button onClick={onSaved}>Save Role</button>
      </div>
    ) : null,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockListUsers = usersApi.listUsers as jest.MockedFunction<
  typeof usersApi.listUsers
>;
const mockDeactivateUser = usersApi.deactivateUser as jest.MockedFunction<
  typeof usersApi.deactivateUser
>;

const mockUsers: UserRead[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Manager",
    email: "john@test.com",
    roles: ["Manager"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Mechanic",
    email: "jane@test.com",
    roles: ["Mechanic"],
    isActive: true,
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: 3,
    firstName: "Bob",
    lastName: "Driver",
    email: "bob@test.com",
    roles: ["Driver"],
    isActive: false,
    createdAt: "2026-01-03T00:00:00Z",
  },
];

function renderWithProviders(userOverride?: TestUser) {
  const defaultUser: TestUser = {
    userId: 1,
    firstName: "Test",
    lastName: "Manager",
    email: "manager@test.com",
    roles: ["Manager"],
    expiresAtUtc: "2026-12-31T23:59:59Z",
  };

  localStorage.clear();
  localStorage.setItem("accessToken", createMockJwt("Test Manager"));
  localStorage.setItem("user", JSON.stringify(userOverride || defaultUser));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("UsersPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    window.alert = jest.fn();
    window.confirm = jest.fn();
    mockListUsers.mockResolvedValue(mockUsers);
  });

  it("renders page title and subtitle", async () => {
    renderWithProviders();

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(
      screen.getByText("Accounts and role management"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalled();
    });
  });

  it("loads and displays users", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
      expect(screen.getByText("Jane Mechanic")).toBeInTheDocument();
      expect(screen.getByText("Bob Driver")).toBeInTheDocument();
    });

    expect(screen.getByText("john@test.com")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("displays user count", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("3 users")).toBeInTheDocument();
    });
  });

  it("displays loading state", () => {
    mockListUsers.mockImplementation(() => new Promise(() => {}));

    renderWithProviders();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays error state on load failure", async () => {
    const errorMessage = "Network error";
    mockListUsers.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("shows New user button for Manager", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /new user/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides New user button for non-Manager", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Test",
      lastName: "Mechanic",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("Jane Mechanic")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /new user/i }),
    ).not.toBeInTheDocument();
  });

  it("shows permission message for non-Manager", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Test",
      lastName: "Mechanic",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(
        screen.getByText(/only Managers can create users or change roles/i),
      ).toBeInTheDocument();
    });
  });

  it("filters users by name", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, role...",
    );
    await user.type(searchInput, "John");

    expect(screen.getByText("John Manager")).toBeInTheDocument();
    expect(screen.queryByText("Jane Mechanic")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Driver")).not.toBeInTheDocument();
  });

  it("filters users by email", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Jane Mechanic")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, role...",
    );
    await user.type(searchInput, "jane@");

    expect(screen.getByText("Jane Mechanic")).toBeInTheDocument();
    expect(screen.queryByText("John Manager")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Driver")).not.toBeInTheDocument();
  });

  it("filters users by role", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, role...",
    );
    await user.type(searchInput, "Driver");

    expect(screen.getByText("Bob Driver")).toBeInTheDocument();
    expect(screen.queryByText("John Manager")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Mechanic")).not.toBeInTheDocument();
  });

  it("shows no users message when filtered list is empty", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, role...",
    );
    await user.type(searchInput, "nonexistent");

    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("displays user roles as badges", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const table = screen.getByRole("table");

    expect(table).toHaveTextContent("Manager");
    expect(table).toHaveTextContent("Mechanic");
    expect(table).toHaveTextContent("Driver");
  });

  it("opens create user dialog when New user is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /new user/i }),
      ).toBeInTheDocument();
    });

    const newUserButton = screen.getByRole("button", { name: /new user/i });
    await user.click(newUserButton);

    expect(screen.getByTestId("user-create-dialog")).toBeInTheDocument();
  });

  it("reloads users after creating new user", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(1);
    });

    const newUserButton = screen.getByRole("button", { name: /new user/i });
    await user.click(newUserButton);

    const saveButton = screen.getByRole("button", { name: /save user/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("opens role dialog when Shield button is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const shieldButtons = screen.getAllByTitle("Change role");
    await user.click(shieldButtons[0]);

    expect(screen.getByTestId("user-role-dialog")).toBeInTheDocument();
    expect(screen.getByText(/John Manager/)).toBeInTheDocument();
  });

  it("reloads users after changing role", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(1);
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const shieldButtons = screen.getAllByTitle("Change role");
    await user.click(shieldButtons[0]);

    const saveRoleButton = screen.getByRole("button", { name: /save role/i });
    await user.click(saveRoleButton);

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("disables role button for non-Manager", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Test",
      lastName: "Mechanic",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const shieldButtons = screen.getAllByTitle("No permission");
    expect(shieldButtons[0]).toBeDisabled();
  });

  it("deactivates user when confirmed", async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    mockDeactivateUser.mockResolvedValue();

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Jane Mechanic")).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByTitle("Deactivate user");
    await user.click(deactivateButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Deactivate Jane Mechanic (jane@test.com)?",
    );

    await waitFor(() => {
      expect(mockDeactivateUser).toHaveBeenCalledWith(2);
      expect(mockListUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("does not deactivate user when cancelled", async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByTitle("Deactivate user");
    await user.click(deactivateButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeactivateUser).not.toHaveBeenCalled();
  });

  it("shows alert on deactivate failure", async () => {
    const errorMessage = "Cannot deactivate user";
    (window.confirm as jest.Mock).mockReturnValue(true);
    mockDeactivateUser.mockRejectedValue(new Error(errorMessage));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByTitle("Deactivate user");
    await user.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("disables deactivate button for inactive users", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Bob Driver")).toBeInTheDocument();
    });

    const inactiveButton = screen.getByTitle("Already inactive");
    expect(inactiveButton).toBeDisabled();
  });

  it("disables deactivate button for non-Manager", async () => {
    renderWithProviders({
      userId: 2,
      firstName: "Test",
      lastName: "Mechanic",
      email: "mechanic@test.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByTitle("No permission");
    expect(deactivateButtons.length).toBeGreaterThan(0);
  });

  it("refreshes user list when Refresh button is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("navigates back when Back button is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("John Manager")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("sorts users by active status then name", async () => {
    const unsortedUsers: UserRead[] = [
      {
        id: 3,
        firstName: "Charlie",
        lastName: "Inactive",
        email: "charlie@test.com",
        roles: ["Driver"],
        isActive: false,
        createdAt: "2026-01-03T00:00:00Z",
      },
      {
        id: 1,
        firstName: "Alice",
        lastName: "Active",
        email: "alice@test.com",
        roles: ["Manager"],
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: 2,
        firstName: "Bob",
        lastName: "Active",
        email: "bob@test.com",
        roles: ["Mechanic"],
        isActive: true,
        createdAt: "2026-01-02T00:00:00Z",
      },
    ];

    mockListUsers.mockResolvedValue(unsortedUsers);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Alice Active")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice Active");
    expect(rows[2]).toHaveTextContent("Bob Active");
    expect(rows[3]).toHaveTextContent("Charlie Inactive");
  });
});
