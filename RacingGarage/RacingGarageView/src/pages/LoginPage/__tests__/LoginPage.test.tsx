import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../LoginPage";
import { createMockJwt } from "@/test-utils";
import * as authApi from "@/api/auth";
import { useAuth } from "@/auth/useAuth";

jest.mock("@/api/auth");
jest.mock("@/auth/useAuth");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockSetSession = jest.fn();
(useAuth as jest.Mock).mockReturnValue({
  setSession: mockSetSession,
});

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockSetSession.mockClear();
  });

  it("renders login form with title and description", () => {
    render(<LoginPage />);

    expect(screen.getByText("Racing Garage")).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("displays email and password input fields", () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("manager@test.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it("prefills email and password with default values", () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(
      "manager@test.com",
    ) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(
      "••••••••",
    ) as HTMLInputElement;

    expect(emailInput.value).toBe("manager@test.com");
    expect(passwordInput.value).toBe("Manager123!");
  });

  it("shows email validation error when email is empty", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("manager@test.com");
    await user.clear(emailInput);
    await user.type(emailInput, "{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("shows email validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("manager@test.com");
    await user.clear(emailInput);
    await user.type(emailInput, "invalid-email");
    await user.type(emailInput, "{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    });
  });

  it("shows password validation error when password is empty", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText("••••••••");
    await user.clear(passwordInput);
    await user.type(passwordInput, "{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("successfully logs in with valid credentials", async () => {
    const mockSession = {
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@test.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
      accessToken: createMockJwt("Manager User"),
    };

    mockLogin.mockResolvedValue(mockSession);

    const user = userEvent.setup();
    render(<LoginPage />);

    const loginButton = screen.getByRole("button", { name: /login/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "manager@test.com",
        password: "Manager123!",
      });
      expect(mockSetSession).toHaveBeenCalledWith(mockSession);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error alert when login fails", async () => {
    const errorMessage = "Invalid credentials";
    mockLogin.mockRejectedValue(new Error(errorMessage));

    window.alert = jest.fn();

    const user = userEvent.setup();
    render(<LoginPage />);

    const loginButton = screen.getByRole("button", { name: /login/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("allows user to change email and password before submitting", async () => {
    mockLogin.mockResolvedValue({
      userId: 2,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
      accessToken: createMockJwt("Test User"),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("manager@test.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    await user.clear(emailInput);
    await user.type(emailInput, "test@example.com");
    await user.clear(passwordInput);
    await user.type(passwordInput, "TestPass123!");

    const loginButton = screen.getByRole("button", { name: /login/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "TestPass123!",
      });
    });
  });

  it("shows form labels correctly", () => {
    render(<LoginPage />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });
});
