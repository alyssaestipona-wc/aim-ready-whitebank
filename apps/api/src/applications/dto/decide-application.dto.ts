import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideApplicationDto {
  @IsIn(['approve', 'decline'])
  decision!: 'approve' | 'decline';

  @IsOptional()
  @IsString()
  reasonCode?: string;
}
