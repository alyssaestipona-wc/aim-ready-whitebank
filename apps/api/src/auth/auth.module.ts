import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { UserEntity } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionRoleGuard } from './guards/session-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    // Config only; `ThrottlerGuard` is applied per-route (login, verify-code
    // in auth.controller.ts), not globally - every other route is unaffected.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    { provide: APP_GUARD, useClass: SessionRoleGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
