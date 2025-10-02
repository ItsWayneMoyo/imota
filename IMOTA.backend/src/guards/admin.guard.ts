import {
  CanActivate, ExecutionContext, Injectable,
  UnauthorizedException, ForbiddenException, SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export const ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ url: string; headers: any; cookies?: any }>();
    const path = req?.url || '';
    // Only guard /admin routes
    if (!path.startsWith('/admin')) return true;

    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) || [];

    // 1) Try admin API key (if present)
    const headerKey =
      req.headers['x-admin-key'] ||
      (req.headers['authorization']?.toString().replace(/^Bearer\s+/i, '') ?? '');
    const roleFromKey = this.roleFromKey(headerKey);
    if (roleFromKey) {
      this.assertRole(roleFromKey, requiredRoles);
      return true;
    }

    // 2) Try JWT from cookie or Bearer
    const cookieToken = req.cookies?.imota_admin_session;
    const bearerToken = req.headers['authorization']?.toString().match(/^Bearer\s+(.+)$/i)?.[1];
    const token = cookieToken || bearerToken;
    if (!token) throw new UnauthorizedException('Missing admin auth');

    try {
      const payload = await this.jwt.verifyAsync(token);
      const role = payload?.role || 'admin';
      this.assertRole(role, requiredRoles);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid admin session');
    }
  }

  private roleFromKey(key?: string): string | null {
    if (!key) return null;
    try {
      const map = JSON.parse(process.env.ADMIN_ROLES_JSON || '{}') as Record<string, string>;
      return map[key] || null;
    } catch {
      return null;
    }
  }

  private assertRole(role: string, required: string[]) {
    if (!required.length) return; // no specific role required
    if (!required.includes(role)) throw new ForbiddenException('Insufficient role');
  }
}
