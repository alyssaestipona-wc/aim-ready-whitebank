import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { CreateApplicationResponse } from '@aim-ready/contracts';

import type { RequestWithSession } from '../auth/guards/session-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApplicationsService,
  type DecideApplicationResult,
  type PickApplicationResult,
  type StaffApplicationDetail,
  type StaffApplicationListItem,
} from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CloseApplicationDto } from './dto/close-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';

const STAFF_ROLES = [
  'branch',
  'officer',
  'approver',
  'ops',
  'opssup',
  'risk',
  'compliance',
] as const;

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

  @Get()
  @Roles(...STAFF_ROLES)
  list(
    @Req() req: RequestWithSession,
    @Query() query: ListApplicationsDto,
  ): Promise<StaffApplicationListItem[]> {
    const user = req.user!;
    return this.applications.findAllForTenant(
      { sub: user.sub, tenantId: user.tenantId },
      query,
    );
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  detail(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
  ): Promise<StaffApplicationDetail> {
    const user = req.user!;
    return this.applications.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id/decide')
  @Roles('approver')
  @HttpCode(200)
  decide(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body() dto: DecideApplicationDto,
  ): Promise<DecideApplicationResult> {
    const user = req.user!;
    return this.applications.decide(
      { sub: user.sub, tenantId: user.tenantId },
      id,
      dto,
    );
  }

  @Patch(':id/pick')
  @Roles('officer')
  @HttpCode(200)
  pick(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
  ): Promise<PickApplicationResult> {
    const user = req.user!;
    return this.applications.pick(
      { sub: user.sub, tenantId: user.tenantId },
      id,
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
