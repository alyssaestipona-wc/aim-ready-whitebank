import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsers1795847440494 implements MigrationInterface {
  name = 'CreateUsers1795847440494';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'tenant_id', type: 'varchar' },
          { name: 'email', type: 'varchar' },
          { name: 'password_hash', type: 'varchar' },
          { name: 'app_scope', type: 'varchar' },
          { name: 'role', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_tenant_id_email',
        columnNames: ['tenant_id', 'email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_tenant_id_email');
    await queryRunner.dropTable('users');
  }
}
