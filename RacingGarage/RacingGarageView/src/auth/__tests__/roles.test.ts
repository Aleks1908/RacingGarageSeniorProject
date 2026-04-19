import { describe, it, expect } from "@jest/globals";
import { hasAnyRole, type Role } from "../roles";

describe("hasAnyRole", () => {
  it("should return true when user has at least one allowed role", () => {
    const userRoles = ["Manager", "Mechanic"];
    const allowedRoles: Role[] = ["Manager"];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(true);
  });

  it("should return true when user has multiple matching roles", () => {
    const userRoles = ["Manager", "Mechanic", "Driver"];
    const allowedRoles: Role[] = ["Mechanic", "Driver"];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(true);
  });

  it("should return false when user has no matching roles", () => {
    const userRoles = ["Driver"];
    const allowedRoles: Role[] = ["Manager", "Mechanic"];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(false);
  });

  it("should return false when userRoles is undefined", () => {
    const allowedRoles: Role[] = ["Manager"];

    expect(hasAnyRole(undefined, allowedRoles)).toBe(false);
  });

  it("should return false when userRoles is empty array", () => {
    const userRoles: string[] = [];
    const allowedRoles: Role[] = ["Manager"];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(false);
  });

  it("should return false when allowedRoles is empty array", () => {
    const userRoles = ["Manager"];
    const allowedRoles: Role[] = [];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(false);
  });

  it("should handle all role types", () => {
    const userRoles = ["PartsClerk"];
    const allowedRoles: Role[] = ["PartsClerk"];

    expect(hasAnyRole(userRoles, allowedRoles)).toBe(true);
  });
});
