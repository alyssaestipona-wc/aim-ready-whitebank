import { IsIn } from 'class-validator';

export class CloseApplicationDto {
  @IsIn(['Disbursed', 'Declined', 'Withdrawn'])
  stage!: 'Disbursed' | 'Declined' | 'Withdrawn';
}
