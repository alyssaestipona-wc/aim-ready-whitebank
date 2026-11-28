import {
  Body,
  Controller,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import type { CreateApplicationResponse } from '@aim-ready/contracts';

import type { RequestWithSession } from '../auth/guards/session-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CloseApplicationDto } from './dto/close-application.dto';

@Controller('applications')
@Roles('borrower')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @HttpCode(200)
  create(
    @Req() req: RequestWithSession,
    @Body() dto: CreateApplicationDto,
  ): Promise<CreateApplicationResponse> {
    const user = req.user!;
    return this.applications.create(
      { sub: user.sub, tenantId: user.tenantId },
      dto,
    );
  }

  @Patch(':id/close')
  @HttpCode(200)
  async close(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body() dto: CloseApplicationDto,
  ): Promise<{ ok: true }> {
    const user = req.user!;
    await this.applications.close(
      { sub: user.sub, tenantId: user.tenantId },
      id,
      dto.stage,
    );
    return { ok: true };
  }
}
