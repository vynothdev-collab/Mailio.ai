import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { Admin, AdminRole } from '../entities/admin.entity';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    // Admin Passport strategy attaches the Admin entity to `request.user`
    // (see `CurrentAdmin` decorator).
    const admin = context.switchToHttp().getRequest<{ user?: Admin }>().user;
    if (!admin) {
      throw new ForbiddenException('Admin authentication required');
    }
    if (!required.includes(admin.role)) {
      throw new ForbiddenException(
        'This action requires a Super Admin account.',
      );
    }
    return true;
  }
}
