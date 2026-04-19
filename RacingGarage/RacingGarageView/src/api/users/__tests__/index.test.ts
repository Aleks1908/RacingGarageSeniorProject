import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  listUsers,
  getUser,
  createUser,
  setUserRole,
  deactivateUser,
  getMe,
  updateUser,
  changeUserPassword,
} from "../index";
import {
  mockApi,
  setupApiMock,
  mockApiSuccess,
} from "../../__tests__/test-utils";
import type {
  UserRead,
  UserCreate,
  UserSetRole,
  UpdateUserDto,
  ChangeUserPasswordDto,
  AuthRefreshResponse,
} from "../types";

describe("users API", () => {
  beforeEach(() => {
    setupApiMock();
  });

  describe("listUsers", () => {
    it("should fetch all users", async () => {
      const mockUsers: UserRead[] = [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          roles: ["Admin"],
          isActive: true,
        } as UserRead,
      ];

      mockApiSuccess(mockUsers);

      const result = await listUsers();

      expect(mockApi).toHaveBeenCalledWith("/api/users", { method: "GET" });
      expect(result).toEqual(mockUsers);
    });
  });

  describe("getUser", () => {
    it("should fetch a single user by id", async () => {
      const mockUser: UserRead = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        roles: ["Admin"],
        isActive: true,
      } as UserRead;

      mockApiSuccess(mockUser);

      const result = await getUser(1);

      expect(mockApi).toHaveBeenCalledWith("/api/users/1", { method: "GET" });
      expect(result).toEqual(mockUser);
    });
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      const createDto: UserCreate = {
        name: "Jane Smith",
        email: "jane@example.com",
        password: "securepass123",
        role: "Mechanic",
      };

      const mockResponse: UserRead = {
        id: 2,
        name: createDto.name,
        email: createDto.email,
        roles: [],
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockApiSuccess(mockResponse);

      const result = await createUser(createDto);

      expect(mockApi).toHaveBeenCalledWith("/api/users", {
        method: "POST",
        body: JSON.stringify(createDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("setUserRole", () => {
    it("should set user role", async () => {
      const roleDto: UserSetRole = {
        role: "Mechanic",
      };

      mockApiSuccess(undefined);

      await setUserRole(1, roleDto);

      expect(mockApi).toHaveBeenCalledWith("/api/users/1/role", {
        method: "PUT",
        body: JSON.stringify(roleDto),
      });
    });
  });

  describe("deactivateUser", () => {
    it("should deactivate a user", async () => {
      mockApiSuccess(undefined);

      await deactivateUser(1);

      expect(mockApi).toHaveBeenCalledWith("/api/users/1/deactivate", {
        method: "PUT",
      });
    });
  });

  describe("getMe", () => {
    it("should fetch current user profile", async () => {
      const mockUser: UserRead = {
        id: 1,
        name: "Current User",
        email: "current@example.com",
        roles: ["Admin"],
        isActive: true,
      } as UserRead;

      mockApiSuccess(mockUser);

      const result = await getMe();

      expect(mockApi).toHaveBeenCalledWith("/api/users/me");
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateUser", () => {
    it("should update current user profile", async () => {
      const updateDto: UpdateUserDto = {
        name: "Updated Name",
        email: "updated@example.com",
        oldPassword: "currentpass",
      };

      const mockResponse: AuthRefreshResponse = {
        token: "new-token",
        user: {} as UserRead,
      };

      mockApiSuccess(mockResponse);

      const result = await updateUser(updateDto);

      expect(mockApi).toHaveBeenCalledWith("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(updateDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("changeUserPassword", () => {
    it("should change user password", async () => {
      const passwordDto: ChangeUserPasswordDto = {
        oldPassword: "oldpass",
        newPassword: "newpass123",
      };

      const mockResponse: AuthRefreshResponse = {
        token: "new-token",
        user: {} as UserRead,
      };

      mockApiSuccess(mockResponse);

      const result = await changeUserPassword(passwordDto);

      expect(mockApi).toHaveBeenCalledWith("/api/users/me/password", {
        method: "PUT",
        body: JSON.stringify(passwordDto),
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
