import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationEntity } from './application.entity';
import { ConsentEntity } from './consent.entity';
import { BorrowerProfileEntity } from './borrower-profile.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      ConsentEntity,
      BorrowerProfileEntity,
    ]),
    TenantConfigModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
