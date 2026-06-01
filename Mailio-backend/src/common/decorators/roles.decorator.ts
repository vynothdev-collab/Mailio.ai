import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as accessible only by the listed roles.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ENTERPRISE_ADMIN, UserRole.SUPER_ADMIN)
 *   @Get('overview') ...
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
