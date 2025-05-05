export type UserRole = 'admin' | 'staff' | 'viewer';

export interface RolePermissions {
  canCreateWarehouse: boolean;
  canEditWarehouse: boolean;
  canDeleteWarehouse: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateWarehouse: true,
    canEditWarehouse: true,
    canDeleteWarehouse: true,
    canViewAnalytics: true,
    canManageUsers: true,
  },
  staff: {
    canCreateWarehouse: false,
    canEditWarehouse: true,
    canDeleteWarehouse: false,
    canViewAnalytics: true,
    canManageUsers: false,
  },
  viewer: {
    canCreateWarehouse: false,
    canEditWarehouse: false,
    canDeleteWarehouse: false,
    canViewAnalytics: true,
    canManageUsers: false,
  },
};