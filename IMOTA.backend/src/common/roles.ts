import { SetMetadata, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

export type AdminRole = 'superadmin' | 'viewer';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const handler = ctx.getHandler();
    const cls = ctx.getClass();

    const rolesClass: AdminRole[] | undefined = Reflect.getMetadata(ROLES_KEY, cls);
    const rolesHandler: AdminRole[] | undefined = Reflect.getMetadata(ROLES_KEY, handler);
    const required: AdminRole[] | undefined = rolesHandler || rolesClass;

    if (!required || required.length === 0) return true;

    const role: AdminRole | undefined = req.adminRole;
    if (!role) throw new ForbiddenException('No admin role');

    if (!required.includes(role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
