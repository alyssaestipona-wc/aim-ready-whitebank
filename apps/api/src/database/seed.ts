import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';

import type { AppScope, Role } from '@aim-ready/contracts';

import { AppDataSource } from './data-source';
import { UserEntity } from '../users/user.entity';
import { BorrowerProfileEntity } from '../applications/borrower-profile.entity';

const TENANT_ID = 'kalinaw';
const DEMO_PASSWORD = 'kalinaw2026';

/**
 * Decision-pipeline inputs for each seeded borrower, lifted verbatim from
 * `apps/web/src/mock/config.ts`'s `BORROWERS` fixture (age, bureau file,
 * years as customer, stable-income flag) - the same "lift, don't invent"
 * rule `SEED_ACCOUNTS` below already follows.
 */
const BORROWER_PROFILES: Record<
  string,
  {
    age: number;
    bureau: 'Full file' | 'Thin file' | 'No file';
    yearsAsCustomer: number;
    stable: boolean;
  }
> = {
  'juan.delacruz@email.com': {
    age: 36,
    bureau: 'Full file',
    yearsAsCustomer: 7,
    stable: true,
  },
  'carmela.bautista@email.com': {
    age: 41,
    bureau: 'Full file',
    yearsAsCustomer: 5,
    stable: false,
  },
};

/**
 * One row per account this build's three frontend apps already simulate.
 * Same emails, same shared demo password, same roles - a lift of the
 * existing mock rosters into real seeded accounts, not an invented one.
 */
const SEED_ACCOUNTS: {
  email: string;
  name: string;
  appScope: AppScope;
  role: Role;
}[] = [
  {
    email: 'juan.delacruz@email.com',
    name: 'Juan Dela Cruz',
    appScope: 'borrower',
    role: 'borrower',
  },
  {
    email: 'carmela.bautista@email.com',
    name: 'Carmela Bautista',
    appScope: 'borrower',
    role: 'borrower',
  },
  {
    email: 'branchofficer@kalinawbank.ph',
    name: 'Bea Santiago',
    appScope: 'staff',
    role: 'branch',
  },
  {
    email: 'loanofficer@kalinawbank.ph',
    name: 'Miguel Ramos',
    appScope: 'staff',
    role: 'officer',
  },
  {
    email: 'approver@kalinawbank.ph',
    name: 'Teresa Lim',
    appScope: 'staff',
    role: 'approver',
  },
  {
    email: 'loanops@kalinawbank.ph',
    name: 'Paolo Reyes',
    appScope: 'staff',
    role: 'ops',
  },
  {
    email: 'opssupervisor@kalinawbank.ph',
    name: 'Celine Uy',
    appScope: 'staff',
    role: 'opssup',
  },
  {
    email: 'creditrisk@kalinawbank.ph',
    name: 'Rafael Cruz',
    appScope: 'staff',
    role: 'risk',
  },
  {
    email: 'compliance@kalinawbank.ph',
    name: 'Nina Torres',
    appScope: 'staff',
    role: 'compliance',
  },
  {
    email: 'admin@kalinawbank.ph',
    name: 'Jonas Mercado',
    appScope: 'admin',
    role: 'admin',
  },
];

export async function seed(dataSource = AppDataSource): Promise<void> {
  const owns = !dataSource.isInitialized;
  if (owns) await dataSource.initialize();
  try {
    const repo = dataSource.getRepository(UserEntity);
    const profileRepo = dataSource.getRepository(BorrowerProfileEntity);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const account of SEED_ACCOUNTS) {
      let user = await repo.findOne({
        where: { tenantId: TENANT_ID, email: account.email },
      });
      if (!user) {
        user = await repo.save(
          repo.create({
            tenantId: TENANT_ID,
            email: account.email,
            passwordHash,
            appScope: account.appScope,
            role: account.role,
            name: account.name,
          }),
        );
      }

      const profile = BORROWER_PROFILES[account.email];
      if (!profile) continue;
      const existingProfile = await profileRepo.findOne({
        where: { userId: user.id },
      });
      if (existingProfile) continue;
      await profileRepo.save(
        profileRepo.create({
          userId: user.id,
          tenantId: TENANT_ID,
          age: profile.age,
          bureau: profile.bureau,
          yearsAsCustomer: profile.yearsAsCustomer,
          stable: profile.stable,
          sanctions: false,
          defaulted: false,
        }),
      );
    }
  } finally {
    if (owns) await dataSource.destroy();
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log(`Seeded ${SEED_ACCOUNTS.length} account(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
