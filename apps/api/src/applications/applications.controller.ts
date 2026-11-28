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
  type ApprovalsSummary,
  type ApprovePreviewResult,
  type BorrowerApplicationListItem,
  type DecideApplicationResult,
  type PickApplicationResult,
  type RecommendApplicationResult,
  type RequestInfoResult,
  type ResolveInfoResult,
  type ReturnToOfficerResult,
  type StaffApplicationDetail,
  type StaffApplicationListItem,
} from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CloseApplicationDto } from './dto/close-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { RecommendApplicationDto } from './dto/recommend-application.dto';

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

  // Declared before `GET /:id` so NestJS matches the literal "mine" segment
  // first - a route registered after a param route can still shadow it, but
  // a route registered before it always wins when both could match.
  @Get('mine')
  mine(@Req() req: RequestWithSession): Promise<BorrowerApplicationListItem[]> {
    const user = req.user!;
    return this.applications.findMineForBorrower({
      sub: user.sub,
      tenantId: user.tenantId,
    });
  }

  // Declared before `GET /:id` for the same reason as `mine` above.
  @Get('approvals-summary')
  @Roles('approver')
  approvalsSummary(@Req() req: RequestWithSession): Promise<ApprovalsSummary> {
    const user = req.user!;
    return this.applications.approvalsSummary({
      sub: user.sub,
      tenantId: user.tenantId,
    });
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

  @Patch(':id/recommend')
  @Roles('officer')
  @HttpCode(200)
  recommend(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body() dto: RecommendApplicationDto,
  ): Promise<RecommendApplicationResult> {
    const user = req.user!;
    return this.applications.recommend(
      { sub: user.sub, tenantId: user.tenantId },
      id,
      dto,
    );
  }

  @Patch(':id/return')
  @Roles('approver')
  @HttpCode(200)
  returnToOfficer(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
  ): Promise<ReturnToOfficerResult> {
    const user = req.user!;
    return this.applications.returnToOfficer(
      { sub: user.sub, tenantId: user.tenantId },
      id,
    );
  }

  @Get(':id/approve-preview')
  @Roles('approver')
  approvePreview(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
  ): Promise<ApprovePreviewResult> {
    const user = req.user!;
    return this.applications.previewApproval(
      { sub: user.sub, tenantId: user.tenantId },
      id,
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

  @Patch(':id/request-info')
  @Roles('officer')
  @HttpCode(200)
  requestInfo(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body() dto: RequestInfoDto,
  ): Promise<RequestInfoResult> {
    const user = req.user!;
    return this.applications.requestInfo(
      { sub: user.sub, tenantId: user.tenantId },
      id,
      dto,
    );
  }

  @Patch(':id/resolve-info')
  @Roles('officer')
  @HttpCode(200)
  resolveInfo(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
  ): Promise<ResolveInfoResult> {
    const user = req.user!;
    return this.applications.resolveInfo(
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
