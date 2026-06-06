import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedActor {
  id: string;
  email: string;
  role: UserRole;
  enterpriseId: string | null;
}

export function isEnterpriseMember(role: UserRole): boolean {
  return (
    role === UserRole.ENTERPRISE_USER || role === UserRole.ENTERPRISE_ADMIN
  );
}
