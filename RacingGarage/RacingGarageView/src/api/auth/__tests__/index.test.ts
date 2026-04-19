import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { LoginRequest, LoginResponse } from "../types";

jest.mock("@/api/client/client");

import { api } from "@/api/client/client";
import { login } from "../index";

const mockApi = api as jest.MockedFunction<typeof api>;

describe("auth API", () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockResolvedValue(undefined as unknown);
  });

  describe("login", () => {
    it("should call API with correct endpoint and payload", async () => {
      const mockResponse: LoginResponse = {
        accessToken: "mock-token-123",
        expiresAtUtc: "2026-01-05T00:00:00Z",
        userId: 1,
        name: "John Doe",
        email: "john@example.com",
        roles: ["Admin"],
      };

      mockApi.mockResolvedValueOnce(mockResponse);

      const request: LoginRequest = {
        email: "john@example.com",
        password: "password123",
      };

      const result = await login(request);

      expect(mockApi).toHaveBeenCalledTimes(1);
      expect(mockApi).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(request),
        auth: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle login errors", async () => {
      const error = Object.assign(new Error("Invalid credentials"), {
        status: 401,
        message: "Invalid credentials",
      });
      mockApi.mockRejectedValueOnce(error);

      const request: LoginRequest = {
        email: "wrong@example.com",
        password: "wrongpass",
      };

      await expect(login(request)).rejects.toMatchObject({
        status: 401,
        message: "Invalid credentials",
      });
    });
  });
});
