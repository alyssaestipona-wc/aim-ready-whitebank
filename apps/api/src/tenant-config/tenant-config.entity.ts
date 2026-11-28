import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * One row per tenant (Phase 1 has exactly one, seeded directly by its own
 * migration). The live source of `killSwitch`/`bureauDown`, replacing the
 * static constants `policy.ts` used to carry.
 */
@Entity({ name: 'tenant_config' })
export class TenantConfigEntity {
  @PrimaryColumn({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'kill_switch', default: false })
  killSwitch!: boolean;

  @Column({ name: 'bureau_down', default: false })
  bureauDown!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
