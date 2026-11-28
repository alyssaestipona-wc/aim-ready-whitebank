import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TokenService } from '../token.service';
import { SessionRoleGuard } from './session-role.guard';

function contextWith(headers: Record<string, string>): ExecutionContext {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe('SessionRoleGuard', () => {
  let reflector: Reflector;
  let tokens: TokenService;
  let guard: SessionRoleGuard;

  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret';
    reflector = new Reflector();
    tokens = new TokenService();
    guard = new SessionRoleGuard(reflector, tokens);
  });

  it('allows a public route with no token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(contextWith({}))).toBe(true);
  });

  it('rejects a non-public route with no token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    expect(() => guard.canActivate(contextWith({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    expect(() =>
      guard.canActivate(
        contextWith({ authorization: 'Bearer not-a-real-token' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a request outside the required role', () => {
    const token = tokens.signSession({
      sub: 'u1',
      tenantId: 'kalinaw',
      appScope: 'borrower',
      role: 'borrower',
      email: 'j@email.com',
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin']);
    expect(() =>
      guard.canActivate(contextWith({ authorization: `Bearer ${token}` })),
    ).toThrow(UnauthorizedException);
  });

  it('allows a valid session within the required role and attaches the payload', () => {
    const token = tokens.signSession({
      sub: 'u1',
      tenantId: 'kalinaw',
      appScope: 'admin',
      role: 'admin',
      email: 'admin@kalinawbank.ph',
    });
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin']);
    const context = contextWith({ authorization: `Bearer ${token}` });
    expect(guard.canActivate(context)).toBe(true);
    expect(
      context.switchToHttp().getRequest<{ user?: { role: string } }>().user
        ?.role,
    ).toBe('admin');
  });
});
