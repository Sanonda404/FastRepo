import { createContext, useContext} from 'react';
import {type RepositoryRole, type RoleCapabilities} from './permissions';


interface RepoPermissionContextType {
  role: RepositoryRole;
  capabilities: RoleCapabilities;
}

export const RepoPermissionContext = createContext<RepoPermissionContextType | undefined>(undefined);

export const useRepoPermissions = () => {
  const context = useContext(RepoPermissionContext);
  if (!context) {
    throw new Error('useRepoPermissions must be used within a RepoPermissionProvider');
  }
  return context;
};