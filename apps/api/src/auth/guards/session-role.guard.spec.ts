import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuditLogService } from '../../audit-log/audit-log.service';
import { TokenService } from '../token.service';
import { SessionRoleGuard } from './session-role.guard';

function contextWith(
  headers: Record<string, string>,
  overrides: { method?: string; path?: string } = {},
): ExecutionContext {
  const request: {
    headers: Record<string, string>;
    user?: unknown;
    method: string;
    path: string;
  } = {
    headers,
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/some-route',
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
  let auditLog: AuditLogService;
  let recordMock: jest.Mock;
  let guard: SessionRoleGuard;

  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret';
    reflector = new Reflector();
    tokens = new TokenService();
    recordMock = jest.fn().mockResolvedValue(undefined);
    auditLog = { record: recordMock } as unknown as AuditLogService;
    guard = new SessionRoleGuard(reflector, tokens, auditLog);
  });

  it('allows a public route with no token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    await expect(guard.canActivate(contextWith({}))).resolves.toBe(true);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('rejects a non-public route with no token, without writing an audit entry', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    await expect(guard.canActivate(contextWith({}))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid token, without writing an audit entry', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    await expect(
      guard.canActivate(
        contextWith({ authorization: 'Bearer not-a-real-token' }),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('rejects a request outside the required role and records it to the audit log', async () => {
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
    await expect(
      guard.canActivate(
        contextWith(
          { authorization: `Bearer ${token}` },
          { method: 'PATCH', path: '/applications/app-1/pick' },
        ),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(recordMock).toHaveBeenCalledWith({
      tenantId: 'kalinaw',
      action: 'permission_denied',
      actorId: 'u1',
      actorEmail: 'j@email.com',
      actorRole: 'borrower',
      reason: 'role_mismatch',
      detail: {
        method: 'PATCH',
        path: '/applications/app-1/pick',
        requiredRoles: ['admin'],
      },
    });
  });

  it('still rejects with UnauthorizedException, not a 500, when the audit write itself fails', async () => {
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
    recordMock.mockRejectedValueOnce(new Error('store unreachable'));
    await expect(
      guard.canActivate(contextWith({ authorization: `Bearer ${token}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows a valid session within the required role, attaches the payload, and writes no audit entry', async () => {
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
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(
      context.switchToHttp().getRequest<{ user?: { role: string } }>().user
        ?.role,
    ).toBe('admin');
    expect(recordMock).not.toHaveBeenCalled();
  });
});
