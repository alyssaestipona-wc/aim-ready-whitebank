import { Body, Controller, Get, Patch, Req } from '@nestjs/common';

import type { RequestWithSession } from '../auth/guards/session-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  TenantConfigService,
  type TenantConfig,
} from './tenant-config.service';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';

@Controller('tenant-config')
@Roles('admin')
export class TenantConfigController {
  constructor(private readonly tenantConfig: TenantConfigService) {}

  @Get()
  get(@Req() req: RequestWithSession): Promise<TenantConfig> {
    const user = req.user!;
    return this.tenantConfig.get(user.tenantId);
  }

  @Patch()
  update(
    @Req() req: RequestWithSession,
    @Body() dto: UpdateTenantConfigDto,
  ): Promise<TenantConfig> {
    const user = req.user!;
    return this.tenantConfig.set(user.tenantId, dto);
  }
}
