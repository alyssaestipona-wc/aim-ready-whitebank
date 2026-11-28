import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddApplicationDecisioning1795852100000 implements MigrationInterface {
  name = 'AddApplicationDecisioning1795852100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('applications', [
      new TableColumn({
        name: 'reviewer_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'decline_reason_code',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'decided_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('applications', [
      'reviewer_id',
      'decline_reason_code',
      'decided_at',
    ]);
  }
}
