import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TenantConfigEntity } from './tenant-config.entity';

export type TenantConfig = { killSwitch: boolean; bureauDown: boolean };
export type TenantConfigPatch = Partial<TenantConfig>;

@Injectable()
export class TenantConfigService {
  private readonly logger = new Logger(TenantConfigService.name);

  constructor(
    @InjectRepository(TenantConfigEntity)
    private readonly tenantConfig: Repository<TenantConfigEntity>,
  ) {}

  async get(tenantId: string): Promise<TenantConfig> {
    let row: TenantConfigEntity | null;
    try {
      row = await this.tenantConfig.findOne({ where: { tenantId } });
    } catch (err) {
      this.logger.error(
        'Tenant config read failed: store unreachable',
        err as Error,
      );
      throw new ServiceUnavailableException(
        'tenant_config_service_unavailable',
      );
    }
    if (!row) throw new NotFoundException();
    return { killSwitch: row.killSwitch, bureauDown: row.bureauDown };
  }

  async set(tenantId: string, patch: TenantConfigPatch): Promise<TenantConfig> {
    const result = await this.tenantConfig
      .createQueryBuilder()
      .update(TenantConfigEntity)
      .set(patch)
      .where('tenant_id = :tenantId', { tenantId })
      .execute();
    if (result.affected !== 1) throw new NotFoundException();
    return this.get(tenantId);
  }
}
