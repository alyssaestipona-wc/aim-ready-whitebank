import { randomInt } from 'node:crypto';

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { LoginResponse, VerifyCodeResponse } from '@aim-ready/contracts';

import { UserEntity } from '../users/user.entity';
import { TokenService } from './token.service';
import type { LoginDto } from './dto/login.dto';
import type { VerifyCodeDto } from './dto/verify-code.dto';

const GENERIC_ERROR = 'Email or password is incorrect.';
const ADMIN_REFUSED_ON_STAFF_PATH =
  'Tenant administrators sign in at the separate admin console.';
const INVALID_CODE = 'That code is incorrect. Try again.';

const TENANT_ID = 'kalinaw';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly tokens: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    let user: UserEntity | null;
    try {
      user = await this.users.findOne({
        where: { tenantId: TENANT_ID, email: dto.email.trim().toLowerCase() },
      });
    } catch (err) {
      this.logger.error(
        'Login failed: identity store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException('identity_service_unavailable');
    }

    if (!user) return { ok: false, error: GENERIC_ERROR };

    // The seeded tenant-administrator account is refused here with a
    // distinct, scope-specific message, before any password check - matching
    // the existing mock behaviour this replaces.
    if (dto.appScope === 'staff' && user.appScope === 'admin')
      return { ok: false, error: ADMIN_REFUSED_ON_STAFF_PATH };

    if (user.appScope !== dto.appScope)
      return { ok: false, error: GENERIC_ERROR };

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) return { ok: false, error: GENERIC_ERROR };

    if (user.appScope === 'borrower') {
      const token = this.tokens.signSession({
        sub: user.id,
        tenantId: user.tenantId,
        appScope: user.appScope,
        role: user.role,
        email: user.email,
      });
      return {
        ok: true,
        kind: 'session',
        token,
        role: user.role,
        email: user.email,
      };
    }

    // Staff and admin accounts need the six-digit code step before a session is issued.
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const pendingToken = this.tokens.signPending({
      sub: user.id,
      tenantId: user.tenantId,
      appScope: user.appScope,
      role: user.role,
      email: user.email,
      code,
    });
    // The code itself is never logged (it is a credential); only that one was
    // issued. No PII (email) in this line, per AGENTS.md's logging rule.
    this.logger.log(
      `Verification code issued for tenant ${user.tenantId} (simulated delivery, not sent)`,
    );
    return {
      ok: true,
      kind: 'code-required',
      pendingToken,
      ...(process.env.NODE_ENV === 'production' ? {} : { devCode: code }),
    };
  }

  verifyCode(dto: VerifyCodeDto): VerifyCodeResponse {
    const pending = this.tokens.verifyPending(dto.pendingToken);
    if (!pending) return { ok: false, error: INVALID_CODE };
    if (dto.code.trim() !== pending.code)
      return { ok: false, error: INVALID_CODE };

    const token = this.tokens.signSession({
      sub: pending.sub,
      tenantId: pending.tenantId,
      appScope: pending.appScope,
      role: pending.role,
      email: pending.email,
    });
    return {
      ok: true,
      kind: 'session',
      token,
      role: pending.role,
      email: pending.email,
    };
  }
}
