import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddApplicationSlaAndInfoRequest1795852300000 implements MigrationInterface {
  name = 'AddApplicationSlaAndInfoRequest1795852300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('applications', [
      new TableColumn({
        name: 'stage_entered_at',
        type: 'timestamptz',
        isNullable: true,
      }),
      new TableColumn({
        name: 'info_request_items',
        type: 'text',
        isArray: true,
        isNullable: true,
      }),
      new TableColumn({
        name: 'info_request_message',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
    // Backfill: every existing row's current stage started at submission,
    // the closest fact on file for it.
    await queryRunner.query(
      'UPDATE applications SET stage_entered_at = created_at WHERE stage_entered_at IS NULL',
    );

    // 'Info requested' is now an open stage too (a borrower waiting on an
    // info request still has an open application for the duplicate-check's
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
        where: "stage IN ('Review', 'Info requested', 'Offer')",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
        where: "stage IN ('Review', 'Offer')",
      }),
    );
    await queryRunner.dropColumns('applications', [
      'stage_entered_at',
      'info_request_items',
      'info_request_message',
    ]);
  }
}
