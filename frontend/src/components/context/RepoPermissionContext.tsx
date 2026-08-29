import React, { type ReactNode } from 'react';
import {type RepositoryRole, ROLE_CAPABILITIES } from '../../lib/auth/permissions';

import { RepoPermissionContext } from '../../lib/auth/RepoPermissionManager';

export const RepoPermissionProvider: React.FC<{
  role: RepositoryRole;
  children: ReactNode;
}> = ({ role, children }) => {
  const capabilities = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.Viewer;

  return (
    <RepoPermissionContext.Provider value={{ role, capabilities }}>
      {children}
    </RepoPermissionContext.Provider>
  );
};
