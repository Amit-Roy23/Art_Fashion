export type Role = "OWNER" | "MANAGER" | "STAFF" | "KARIGAR";

export type Permission =
  | "orders:view"
  | "orders:create"
  | "orders:edit"
  | "orders:delete"
  | "pieces:view"
  | "pieces:edit"
  | "assignments:view"
  | "assignments:create"
  | "assignments:edit"
  | "submissions:submit"
  | "submissions:approve"
  | "jobwork:view"
  | "jobwork:manage"
  | "deliveries:view"
  | "deliveries:create"
  | "weights:edit"
  | "customers:view"
  | "customers:manage"
  | "artisans:view"
  | "artisans:manage"
  | "reports:view"
  | "settings:manage"
  | "users:manage"
  | "prices:view";

export type PermissionMatrix = Record<Role, Permission[]>;

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  OWNER: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:delete",
    "pieces:view",
    "pieces:edit",
    "assignments:view",
    "assignments:create",
    "assignments:edit",
    "submissions:submit",
    "submissions:approve",
    "jobwork:view",
    "jobwork:manage",
    "deliveries:view",
    "deliveries:create",
    "weights:edit",
    "customers:view",
    "customers:manage",
    "artisans:view",
    "artisans:manage",
    "reports:view",
    "settings:manage",
    "users:manage",
    "prices:view",
  ],
  MANAGER: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "pieces:view",
    "pieces:edit",
    "assignments:view",
    "assignments:create",
    "assignments:edit",
    "submissions:submit",
    "submissions:approve",
    "jobwork:view",
    "jobwork:manage",
    "deliveries:view",
    "deliveries:create",
    "weights:edit",
    "customers:view",
    "customers:manage",
    "artisans:view",
    "artisans:manage",
    "reports:view",
    "prices:view",
  ],
  STAFF: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "pieces:view",
    "pieces:edit",
    "assignments:view",
    "assignments:create",
    "submissions:submit",
    "submissions:approve",
    "jobwork:view",
    "jobwork:manage",
    "deliveries:view",
    "deliveries:create",
    "customers:view",
    "customers:manage",
    "artisans:view",
  ],
  KARIGAR: [
    "assignments:view",
    "submissions:submit",
  ],
};

export function hasPermission(
  role: Role | string | undefined | null,
  permission: Permission,
  customMatrix?: PermissionMatrix | null
): boolean {
  if (!role) return false;
  if (role === "OWNER") return true; // Owner always has all permissions

  const activeMatrix = customMatrix || DEFAULT_PERMISSION_MATRIX;
  const rolePermissions = activeMatrix[role as Role];
  if (!rolePermissions) return false;

  return rolePermissions.includes(permission);
}

export function requirePermission(
  role: Role | string | undefined | null,
  permission: Permission,
  customMatrix?: PermissionMatrix | null
): void {
  if (!hasPermission(role, permission, customMatrix)) {
    throw new Error(`Forbidden: Role '${role}' lacks permission '${permission}'`);
  }
}
