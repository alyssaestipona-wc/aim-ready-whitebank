import {
  IsBoolean,
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import type { ProductCode } from '../policy';

export class CreateApplicationDto {
  @IsIn(['PL', 'SL'])
  product!: ProductCode;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsInt()
  @IsPositive()
  tenor!: number;

  @IsInt()
  @IsPositive()
  income!: number;

  @IsInt()
  @Min(0)
  obligations!: number;

  @IsString()
  @MinLength(1)
  purpose!: string;

  @IsBoolean()
  consentCredit!: boolean;

  @IsBoolean()
  consentData!: boolean;

  @IsBoolean()
  consentTerms!: boolean;
}
