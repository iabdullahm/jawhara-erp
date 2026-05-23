import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // لا قيود → سماح
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest() as { user: AuthUser };
    if (!user) {
      throw new ForbiddenException('غير مصادق عليه');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `الصلاحية غير كافية. مطلوب: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
