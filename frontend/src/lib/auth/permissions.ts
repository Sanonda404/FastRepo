export type RepositoryRole = 'Owner' | 'Admin' | 'Maintainer' | 'Member' | 'Viewer';

export interface RoleCapabilities {
  canManageSettings: boolean;
  canManageTeams: boolean;
  canManagePermissions: boolean;
  canPushDirectly: boolean;
  canCreateBranch: boolean;
  canDeleteRepo: boolean;
  canOpenPullRequest: boolean;
}

export const ROLE_CAPABILITIES: Record<RepositoryRole, RoleCapabilities> = {
  Owner: {
    canManageSettings: true,
    canManageTeams: true,
    canManagePermissions: true,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: true,
    canOpenPullRequest: true,
  },
  Admin: {
    canManageSettings: true,
    canManageTeams: true,
    canManagePermissions: true,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: false,
    canOpenPullRequest: true,
  },
  Maintainer: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: true,
    canCreateBranch: true,
    canDeleteRepo: false,
    canOpenPullRequest: true,
  },
  Member: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: false, // Subject to team/path rules
    canCreateBranch: true,
    canDeleteRepo: false,
    canOpenPullRequest: true,
  },
  Viewer: {
    canManageSettings: false,
    canManageTeams: false,
    canManagePermissions: false,
    canPushDirectly: false,
    canCreateBranch: false,
    canDeleteRepo: false,
    canOpenPullRequest: false,
  },
};