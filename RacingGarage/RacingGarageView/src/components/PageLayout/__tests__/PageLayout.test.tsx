import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PageLayout from "../PageLayout";
import { AuthProvider } from "@/auth/AuthProvider";
import { createMockJwt } from "@/test-utils";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("PageLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it("should render title and children", () => {
    localStorage.setItem("accessToken", createMockJwt("Test User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Test Page">
            <div>Page Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Test Page")).toBeInTheDocument();
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });

  it("should render subtitle when provided", () => {
    localStorage.setItem("accessToken", createMockJwt("Test User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Test Page" subtitle="Test Subtitle">
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
  });

  it("should display user name and roles", () => {
    localStorage.setItem("accessToken", createMockJwt("John Doe"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        roles: ["Manager", "Mechanic"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Dashboard">
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Logged in as John Doe/)).toBeInTheDocument();
    expect(screen.getByText("Manager, Mechanic")).toBeInTheDocument();
  });

  it("should navigate to home when Home button is clicked", () => {
    localStorage.setItem("accessToken", createMockJwt("Test User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Test Page">
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    const homeButton = screen.getByRole("button", { name: /home/i });
    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should logout and navigate to login when Logout button is clicked", () => {
    localStorage.setItem("accessToken", createMockJwt("Test User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Test Page">
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should render rightSlot when provided", () => {
    localStorage.setItem("accessToken", createMockJwt("Test User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout
            title="Test Page"
            rightSlot={<button>Custom Action</button>}
          >
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Custom Action" }),
    ).toBeInTheDocument();
  });

  it("should handle users with no roles", () => {
    localStorage.setItem("accessToken", createMockJwt("No Role User"));
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: 1,
        firstName: "No Role",
        lastName: "User",
        email: "norole@example.com",
        roles: [],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <PageLayout title="Test Page">
            <div>Content</div>
          </PageLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Logged in as No Role User/)).toBeInTheDocument();
  });
});
