import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddRecommendationAndTenantConfig1795852500000 implements MigrationInterface {
  name = 'AddRecommendationAndTenantConfig1795852500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'applications',
      new TableColumn({
        name: 'recommendation',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // 'Approval' is now an open stage too (a recommended-but-undecided
    // application still has an open application for the duplicate-check's
    // purposes) - Postgres can't ALTER an index predicate in place, so the
    // index is dropped and recreated with the wider predicate.
    await queryRunner.dropIndex(
      'applications',
      'idx_applications_open_per_product',
    );
    await queryRunner.createIndex(
      'applications',
      new TableIndex({
        name: 'idx_applications_open_per_product',
        columnNames: ['tenant_id', 'borrower_id', 'product_code'],
        isUnique: true,
        where: "stage IN ('Review', 'Info requested', 'Approval', 'Offer')",
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'tenant_config',
        columns: [
          { name: 'tenant_id', type: 'varchar', isPrimary: true },
          { name: 'kill_switch', type: 'boolean', default: false },
          { name: 'bureau_down', type: 'boolean', default: false },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
    // Phase 1 has exactly one seeded tenant - seed its row directly rather
    // than building upsert-on-read logic for a single-row table.
    await queryRunner.query(
      `INSERT INTO tenant_config (tenant_id, kill_switch, bureau_down) VALUES ('kalinaw', false, false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tenant_config');
    await queryRunner.dropIndex(
      'applications',
      'idx_applications_open_per_product',
    );
    await queryRunner.createIndex(
      'applications',
      new TableIndex({
        name: 'idx_applications_open_per_product',
        columnNames: ['tenant_id', 'borrower_id', 'product_code'],
        isUnique: true,
        where: "stage IN ('Review', 'Info requested', 'Offer')",
      }),
    );
    await queryRunner.dropColumn('applications', 'recommendation');
  }
}
