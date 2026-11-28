import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ConsentKind = 'credit_check' | 'data_processing' | 'terms';

@Entity({ name: 'consents' })
@Index(['applicationId', 'kind'], { unique: true })
export class ConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'varchar' })
  kind!: ConsentKind;

  @CreateDateColumn({ name: 'captured_at' })
  capturedAt!: Date;

  @Column({ name: 'terms_version' })
  termsVersion!: string;
}
