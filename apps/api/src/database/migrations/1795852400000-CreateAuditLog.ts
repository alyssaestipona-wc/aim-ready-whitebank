import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLog1795852400000 implements MigrationInterface {
  name = 'CreateAuditLog1795852400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'tenant_id', type: 'varchar' },
          { name: 'action', type: 'varchar' },
          { name: 'actor_id', type: 'varchar' },
          { name: 'actor_email', type: 'varchar' },
          { name: 'actor_role', type: 'varchar' },
          { name: 'reason', type: 'varchar' },
          { name: 'detail', type: 'jsonb' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
    // Powers the tenant-scoped, newest-first list endpoint - the only read
    // path this table has.
    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'idx_audit_log_tenant_created',
        columnNames: ['tenant_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('audit_log', 'idx_audit_log_tenant_created');
    await queryRunner.dropTable('audit_log');
  }
}
