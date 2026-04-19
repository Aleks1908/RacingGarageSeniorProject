import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "../AuthProvider";
import { useAuth } from "../useAuth";
import type { LoginResponse } from "@/api/auth/types";
import type { AuthRefreshResponse } from "@/api/users/types";
import type { ReactNode } from "react";
import { createMockJwt } from "@/test-utils";

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe("initial state", () => {
    it("should initialize with null token and user when localStorage is empty", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it("should initialize from localStorage when available", () => {
      const mockToken = createMockJwt("Test User");
      const mockUser = {
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
      };

      localStorage.setItem("accessToken", mockToken);
      localStorage.setItem("user", JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.token).toBe(mockToken);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe("setSession", () => {
    it("should handle LoginResponse and store token and user", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const loginResponse: LoginResponse = {
        accessToken: createMockJwt("John Doe"),
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        roles: ["Manager", "Mechanic"],
      };

      act(() => {
        result.current.setSession(loginResponse);
      });

      expect(result.current.token).toBe(loginResponse.accessToken);
      expect(result.current.user).toEqual({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        roles: ["Manager", "Mechanic"],
      });

      expect(localStorage.getItem("accessToken")).toBe(
        loginResponse.accessToken,
      );
      expect(JSON.parse(localStorage.getItem("user")!)).toEqual({
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        roles: ["Manager", "Mechanic"],
      });
    });

    it("should handle AuthRefreshResponse and normalize to token format", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockJwt = createMockJwt("Jane Smith", 1798767599);

      const refreshResponse: AuthRefreshResponse = {
        token: mockJwt,
        user: {
          id: 2,
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          roles: ["Driver"],
          createdAt: "2025-01-01T00:00:00Z",
          isActive: true,
        },
      };

      act(() => {
        result.current.setSession(refreshResponse);
      });

      expect(result.current.token).toBe(mockJwt);
      expect(result.current.user).toMatchObject({
        userId: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        roles: ["Driver"],
      });
      expect(result.current.user?.expiresAtUtc).toBeDefined();
    });
  });

  describe("logout", () => {
    it("should clear token, user, and localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const loginResponse: LoginResponse = {
        accessToken: createMockJwt("Test User"),
        expiresAtUtc: "2026-12-31T23:59:59Z",
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: ["Manager"],
      };

      act(() => {
        result.current.setSession(loginResponse);
      });

      expect(result.current.token).toBe(loginResponse.accessToken);
      expect(result.current.user).not.toBeNull();

      act(() => {
        result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("should handle logout when already logged out", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.token).toBeNull();

      act(() => {
        result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
});
