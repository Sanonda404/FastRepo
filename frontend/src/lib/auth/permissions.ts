export type RepositoryRole = 'Owner' | 'Admin' | 'Maintainer' | 'Member' | 'Viewer';

export interface RoleCapabilities {
  canManageSettings: boolean;
  canManageTeams: boolean;
  canManagePermissions: boolean;
  canPushDirectly: boolean;
  canCreateBranch: boolean;
  canDeleteRepo: boolean;
}

export const ROLE_CAPABILITIES: Record<RepositoryRole, RoleCapabilities> = {
  Owner: {
    canManageSettings: true,
    canManageTeams: true,
    canManagePermissions: true,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: true,
  },
  Admin: {
    canManageSettings: true,
    canManageTeams: true,
    canManagePermissions: true,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: false,
  },
  Maintainer: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: false,
  },
  Member: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: false, // Subject to team/path rules
    canCreateBranch: true,
    canDeleteRepo: false,
  },
  Viewer: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: false,
    canCreateBranch: false,
    canDeleteRepo: false,
  },
};