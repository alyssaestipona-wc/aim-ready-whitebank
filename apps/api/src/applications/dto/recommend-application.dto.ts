import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecommendApplicationDto {
  @IsIn(['approve', 'counter', 'decline'])
  decision!: 'approve' | 'counter' | 'decline';

  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @IsInt()
  @IsPositive()
  tenor!: number;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
