import { describe, it, expect } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { AuthProvider } from "../AuthProvider";
import type { ReactNode } from "react";

describe("useAuth", () => {
  it("should throw error when used outside AuthProvider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used inside AuthProvider");

    spy.mockRestore();
  });

  it("should return auth context when used inside AuthProvider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toHaveProperty("token");
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("setSession");
    expect(result.current).toHaveProperty("logout");
  });

  it("should have token as null initially when no stored token", () => {
    localStorage.clear();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
