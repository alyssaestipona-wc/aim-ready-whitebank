import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { LoginResponse, VerifyCodeResponse } from '@aim-ready/contracts';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifySessionDto } from './dto/verify-session.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import type { RequestWithSession } from './guards/session-role.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokens: TokenService,
  ) {}

  // Only these two credential-guessing endpoints are throttled; every other
  // route in this app is unaffected (ThrottlerGuard is applied here, not
  // globally via APP_GUARD).
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-code')
  @HttpCode(200)
  verifyCode(@Body() dto: VerifyCodeDto): VerifyCodeResponse {
    return this.authService.verifyCode(dto);
  }

  /** Server-side verification endpoint; each frontend's own route gate verifies locally instead (see design.md), but this exists for the api-auth contract itself and for manual/integration testing. */
  @Public()
  @Post('verify-session')
  @HttpCode(200)
  verifySession(@Body() dto: VerifySessionDto) {
    const payload = this.tokens.verifySession(dto.token);
    if (!payload) throw new UnauthorizedException();
    return {
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
      appScope: payload.appScope,
    };
  }

  @Get('me')
  me(@Req() req: RequestWithSession) {
    return req.user;
  }

  /** Demonstrates role-restricted access for the role-boundary requirement; not a real feature route. */
  @Roles('admin')
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }
}
