import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Role, SessionTokenPayload } from '@aim-ready/contracts';

import { AuditLogService } from '../../audit-log/audit-log.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TokenService } from '../token.service';

export type RequestWithSession = Request & { user?: SessionTokenPayload };

/**
 * Default-deny: a route with no `@Public()` is reachable only with a valid
 * session, and a route with `@Roles(...)` is reachable only by those roles -
 * independent of whatever the calling frontend's UI does or does not show.
 */
@Injectable()
export class SessionRoleGuard implements CanActivate {
  private readonly logger = new Logger(SessionRoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : null;
    if (!token) throw new UnauthorizedException();

    const payload = this.tokens.verifySession(token);
    if (!payload) throw new UnauthorizedException();

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (
      requiredRoles &&
      requiredRoles.length > 0 &&
      !requiredRoles.includes(payload.role)
    ) {
      // Best-effort: a broken audit write must never change the outcome of
      // the refusal itself (no pass-through, no 500 in its place).
      try {
        await this.auditLog.record({
          tenantId: payload.tenantId,
          action: 'permission_denied',
          actorId: payload.sub,
          actorEmail: payload.email,
          actorRole: payload.role,
          reason: 'role_mismatch',
          detail: {
            method: request.method,
            path: request.path,
            requiredRoles,
          },
        });
      } catch (err) {
        this.logger.error('Audit log write failed', err as Error);
      }
      throw new UnauthorizedException();
    }

    request.user = payload;
    return true;
  }
}
