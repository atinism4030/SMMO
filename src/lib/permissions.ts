import type { JWTPayload } from '@/types';

export function isCEO(user: JWTPayload | null): boolean {
  return user?.role === 'CEO';
}

export function isWorker(user: JWTPayload | null): boolean {
  return user?.role === 'WORKER';
}

export function requireCEO(user: JWTPayload | null): void {
  if (!isCEO(user)) {
    throw new Error('Unauthorized: CEO access required');
  }
}

export function requireAuth(user: JWTPayload | null): void {
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
}

export function canUpdateTask(user: JWTPayload, taskAssignedTo?: string, taskClaimedBy?: string): boolean {
  if (isCEO(user)) return true;
  return user.userId === taskAssignedTo || user.userId === taskClaimedBy;
}

export function canViewPayments(user: JWTPayload | null): boolean {
  return isCEO(user);
}

export function canViewAgreements(user: JWTPayload | null): boolean {
  return isCEO(user);
}

export function canDeleteClient(user: JWTPayload | null): boolean {
  return isCEO(user);
}

export function canManageUsers(user: JWTPayload | null): boolean {
  return isCEO(user);
}
