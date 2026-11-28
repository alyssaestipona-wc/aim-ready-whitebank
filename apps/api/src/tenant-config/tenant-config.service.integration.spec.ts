import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { TenantConfigEntity } from './tenant-config.entity';
import { TenantConfigService } from './tenant-config.service';

/**
 * Touches TypeORM against the real local PostgreSQL `aimready_test`
 * database (per AGENTS.md's testing rule: no mocked repository for
 * TypeORM-touching tests). Requires `pnpm --filter api migration:run`
 * to have been run against that database at least once (seeds the
 * `kalinaw` tenant's row).
 */
describe('TenantConfigService (integration)', () => {
  let dataSource: DataSource;
  let repo: Repository<TenantConfigEntity>;
  let service: TenantConfigService;

  const TENANT_ID = 'kalinaw';

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'aimready',
      password: process.env.DB_PASSWORD ?? 'aimready_dev',
      database: process.env.DB_NAME ?? 'aimready_test',
      entities: [TenantConfigEntity],
      synchronize: false,
    });
    await dataSource.initialize();
    repo = dataSource.getRepository(TenantConfigEntity);
    service = new TenantConfigService(repo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await repo.update(
      { tenantId: TENANT_ID },
      { killSwitch: false, bureauDown: false },
    );
  });

  it('reads the seeded default', async () => {
    await expect(service.get(TENANT_ID)).resolves.toEqual({
      killSwitch: false,
      bureauDown: false,
    });
  });

  it('set() then get() reflects the change', async () => {
    await service.set(TENANT_ID, { killSwitch: true });
    await expect(service.get(TENANT_ID)).resolves.toEqual({
      killSwitch: true,
      bureauDown: false,
    });
  });

  it('updates only the patched flag, leaving the other unchanged', async () => {
    await service.set(TENANT_ID, { killSwitch: true });
    await service.set(TENANT_ID, { bureauDown: true });
    await expect(service.get(TENANT_ID)).resolves.toEqual({
      killSwitch: true,
      bureauDown: true,
    });
  });

  it('throws NotFoundException for an unseeded tenant', async () => {
    await expect(service.get('no-such-tenant')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
