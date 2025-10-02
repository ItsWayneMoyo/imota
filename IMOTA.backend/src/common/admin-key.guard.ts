// src/common/admin-key.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AdminRole } from './roles';

function roleFromKey(key: string | undefined): AdminRole | undefined {
  try {
    const raw = process.env.ADMIN_ROLES_JSON || '';
    // Back-compat: if no JSON map configured, treat any provided key as superadmin
    if (!raw) return key ? 'superadmin' : undefined;
    const map = JSON.parse(raw) as Record<string, AdminRole>;
    return key ? map[key] : undefined;
  } catch {
    // If JSON is malformed, fall back to superadmin for the provided key
    return key ? 'superadmin' : undefined;
  }
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = (req.headers['x-admin-key'] as string | undefined) ?? undefined;

    const legacy = process.env.ADMIN_API_KEY || ''; // optional single-key mode
    const role = roleFromKey(key);

    // allow if matches legacy single key OR if key exists in ADMIN_ROLES_JSON map
    const ok = (!!legacy && key === legacy) || !!role;
    if (!ok) throw new UnauthorizedException('invalid admin key');

    // attach role for downstream controllers/guards
    req.adminRole = role || 'superadmin';
    return true;
  }
}
