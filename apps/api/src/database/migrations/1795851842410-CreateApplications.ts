import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateApplications1795851842410 implements MigrationInterface {
  name = 'CreateApplications1795851842410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'tenant_id', type: 'varchar' },
          { name: 'borrower_id', type: 'uuid' },
          { name: 'product_code', type: 'varchar' },
          { name: 'amount', type: 'integer' },
          { name: 'tenor', type: 'integer' },
          { name: 'income', type: 'integer' },
          { name: 'obligations', type: 'integer' },
          { name: 'purpose', type: 'varchar' },
          { name: 'stage', type: 'varchar' },
          { name: 'decision', type: 'jsonb' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
    // Open stages only: this is what actually prevents the duplicate-open-
    // application race (two concurrent submits), not just the service's own
    // pre-check - the unique constraint is the real enforcement point.
    await queryRunner.createIndex(
      'applications',
      new TableIndex({
        name: 'idx_applications_open_per_product',
        columnNames: ['tenant_id', 'borrower_id', 'product_code'],
        isUnique: true,
        where: "stage IN ('Review', 'Offer')",
      }),
    );
    await queryRunner.createForeignKey(
      'applications',
      new TableForeignKey({
        name: 'fk_applications_borrower',
        columnNames: ['borrower_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'consents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'application_id', type: 'uuid' },
          { name: 'kind', type: 'varchar' },
          { name: 'captured_at', type: 'timestamptz', default: 'now()' },
          { name: 'terms_version', type: 'varchar' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'idx_consents_application_kind',
        columnNames: ['application_id', 'kind'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'consents',
      new TableForeignKey({
        name: 'fk_consents_application',
        columnNames: ['application_id'],
        referencedTableName: 'applications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'borrower_profiles',
        columns: [
          { name: 'user_id', type: 'uuid', isPrimary: true },
          { name: 'tenant_id', type: 'varchar' },
          { name: 'age', type: 'integer' },
          { name: 'bureau', type: 'varchar' },
          { name: 'years_as_customer', type: 'integer' },
          { name: 'stable', type: 'boolean' },
          { name: 'sanctions', type: 'boolean', default: false },
          { name: 'defaulted', type: 'boolean', default: false },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'borrower_profiles',
      new TableForeignKey({
        name: 'fk_borrower_profiles_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'borrower_profiles',
      'fk_borrower_profiles_user',
    );
    await queryRunner.dropTable('borrower_profiles');
    await queryRunner.dropForeignKey('consents', 'fk_consents_application');
    await queryRunner.dropIndex('consents', 'idx_consents_application_kind');
    await queryRunner.dropTable('consents');
    await queryRunner.dropForeignKey(
      'applications',
      'fk_applications_borrower',
    );
    await queryRunner.dropIndex(
      'applications',
      'idx_applications_open_per_product',
    );
    await queryRunner.dropTable('applications');
  }
}
