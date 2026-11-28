import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddApplicationAssignee1795852200000 implements MigrationInterface {
  name = 'AddApplicationAssignee1795852200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('applications', [
      new TableColumn({
        name: 'assignee_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'assigned_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
    // Covers both queue filters' WHERE clauses (mine: tenant_id + assignee_id;
    // unassigned: tenant_id + stage + assignee_id) and pick()'s conditional
    // UPDATE - the exact "work queues" hot path AGENTS.md's data rule calls
    // out for indexing.
    await queryRunner.createIndex(
      'applications',
      new TableIndex({
        name: 'idx_applications_tenant_stage_assignee',
        columnNames: ['tenant_id', 'stage', 'assignee_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'applications',
      'idx_applications_tenant_stage_assignee',
    );
    await queryRunner.dropColumns('applications', [
      'assignee_id',
      'assigned_at',
    ]);
  }
}
