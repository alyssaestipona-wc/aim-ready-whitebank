import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';

import { UserEntity } from '../users/user.entity';
import { ApplicationEntity } from '../applications/application.entity';
import { BorrowerProfileEntity } from '../applications/borrower-profile.entity';
import { ConsentEntity } from '../applications/consent.entity';

/**
 * Local PostgreSQL defaults match the `aimready`/`aimready_dev` role and
 * database already created for local development - safe to run with no
 * further setup. A real deployment overrides every one of these via env.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'aimready',
  password: process.env.DB_PASSWORD ?? 'aimready_dev',
  database: process.env.DB_NAME ?? 'aimready',
  entities: [
    UserEntity,
    ApplicationEntity,
    ConsentEntity,
    BorrowerProfileEntity,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
