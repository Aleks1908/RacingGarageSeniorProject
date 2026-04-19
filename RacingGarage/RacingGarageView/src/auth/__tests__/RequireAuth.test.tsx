import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "../RequireAuth";
import { AuthProvider } from "../AuthProvider";

describe("RequireAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should redirect to /login when user is not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <RequireAuth>
                  <div>Protected Content</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render children when user is authenticated", () => {
    localStorage.setItem("accessToken", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <RequireAuth>
                  <div>Protected Content</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
