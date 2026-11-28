import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AppScope, Role } from '@aim-ready/contracts';

/**
 * A seeded account for one of the three frontend apps' identities. One row
 * per email per tenant - the seeded tenant-administrator email exists only
 * with app_scope "admin", never duplicated as a "staff" row, so a staff
 * login attempt for that email resolves to a scope mismatch rather than a
 * second account.
 */
@Entity({ name: 'users' })
@Index(['tenantId', 'email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column()
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'app_scope', type: 'varchar' })
  appScope!: AppScope;

  @Column({ type: 'varchar' })
  role!: Role;

  @Column()
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
