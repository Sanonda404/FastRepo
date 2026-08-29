// components/guards/HasCapability.tsx
import React from 'react';
import { useRepoPermissions } from '@/lib/auth/RepoPermissionManager';
import type { RoleCapabilities } from '@/lib/auth/permissions';

interface HasCapabilityProps {
  capability: keyof RoleCapabilities;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const HasCapability: React.FC<HasCapabilityProps> = ({
  capability,
  children,
  fallback = null,
}) => {
  const { capabilities } = useRepoPermissions();
  return capabilities[capability] ? <>{children}</> : <>{fallback}</>;
};