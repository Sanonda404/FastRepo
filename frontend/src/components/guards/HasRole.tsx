// components/guards/HasRole.tsx
import React from 'react';
import { useRepoPermissions } from '@/lib/auth/RepoPermissionManager';
import type { RepositoryRole } from '@/lib/auth/permissions';

interface HasRoleProps {
  roles: RepositoryRole[];
  children: React.ReactNode;
}

export const HasRole: React.FC<HasRoleProps> = ({ roles, children }) => {
  const { role } = useRepoPermissions();
  return roles.includes(role) ? <>{children}</> : null;
};