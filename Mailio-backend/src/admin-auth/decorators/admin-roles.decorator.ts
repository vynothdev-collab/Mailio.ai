import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../entities/admin.entity';

export const ADMIN_ROLES_KEY = 'admin_roles';

/**
 * Restrict an admin route to specific admin roles (SUPER_ADMIN, ADMIN).
 *
 * Usage:
 *   @UseGuards(AdminJwtGuard, AdminRolesGuard)
 *   @AdminRoles(AdminRole.SUPER_ADMIN)
 */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
