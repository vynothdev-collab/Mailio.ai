import { UserRole } from '../../users/entities/user.entity';

/**
 * The minimum identity surface every controller can rely on after JwtAuthGuard.
 * The full User entity is still attached to the request, but treat this shape
 * as the contract — anything the frontend needs about the actor should be
 * derivable from here, otherwise add it explicitly.
 */
export interface AuthenticatedActor {
  id: string;
  email: string;
  role: UserRole;
  enterpriseId: string | null;
}

export function isEnterpriseMember(role: UserRole): boolean {
  return role === UserRole.ENTERPRISE_USER || role === UserRole.ENTERPRISE_ADMIN;
}
