export type Role = "Manager" | "Mechanic" | "Driver" | "PartsClerk";

export function hasAnyRole(userRoles: string[] | undefined, allow: Role[]) {
  const roles = userRoles ?? [];
  return roles.some((r) => allow.includes(r as Role));
}
