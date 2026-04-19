import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRole from "../RequireRole";
import { AuthProvider } from "../AuthProvider";

describe("RequireRole", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should redirect to /login when user is not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/admin"
              element={
                <RequireRole allow={["Manager"]}>
                  <div>Admin Content</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("should redirect to /dashboard when user lacks required role", () => {
    localStorage.setItem("accessToken", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Driver"],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route
              path="/admin"
              element={
                <RequireRole allow={["Manager", "Mechanic"]}>
                  <div>Admin Content</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("should render children when user has one of the required roles", () => {
    localStorage.setItem("accessToken", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager", "Driver"],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route
              path="/admin"
              element={
                <RequireRole allow={["Manager"]}>
                  <div>Admin Content</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("should render children when user has multiple matching roles", () => {
    localStorage.setItem("accessToken", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager", "Mechanic", "Driver"],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/workshop"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route
              path="/workshop"
              element={
                <RequireRole allow={["Mechanic", "Manager"]}>
                  <div>Workshop Content</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Workshop Content")).toBeInTheDocument();
  });

  it("should redirect to dashboard when user has no roles", () => {
    localStorage.setItem("accessToken", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: [],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route
              path="/admin"
              element={
                <RequireRole allow={["Manager"]}>
                  <div>Admin Content</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
