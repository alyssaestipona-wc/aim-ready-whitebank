import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Role, SessionTokenPayload } from '@aim-ready/contracts';

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
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
    )
      throw new UnauthorizedException();

    request.user = payload;
    return true;
  }
}
