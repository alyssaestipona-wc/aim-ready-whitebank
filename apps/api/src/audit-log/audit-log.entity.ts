import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only: no caller in this codebase has a path to update or delete a
 * row once written (see `AuditLogService` - it exposes only `record()` and
 * `list()`).
 */
@Entity({ name: 'audit_log' })
@Index(['tenantId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /** e.g. `'permission_denied'` - extensible for a future general action log. */
  @Column()
  action!: string;

  @Column({ name: 'actor_id' })
  actorId!: string;

  @Column({ name: 'actor_email' })
  actorEmail!: string;

  @Column({ name: 'actor_role' })
  actorRole!: string;

  /** e.g. `'role_mismatch'`. */
  @Column()
  reason!: string;

  /** Free-form, e.g. `{ method, path, requiredRoles }`. */
  @Column({ type: 'jsonb' })
  detail!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
