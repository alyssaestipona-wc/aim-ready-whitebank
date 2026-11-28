import { IsIn, IsOptional } from 'class-validator';

import type { ApplicationStage } from '../application.entity';
import { PRODUCTS, type ProductCode } from '../policy';

const STAGES: ApplicationStage[] = [
  'Review',
  'Offer',
  'Declined',
  'Disbursed',
  'Withdrawn',
];

const PRODUCT_CODES = Object.keys(PRODUCTS) as ProductCode[];

export class ListApplicationsDto {
  @IsOptional()
  @IsIn(STAGES)
  stage?: ApplicationStage;

  @IsOptional()
  @IsIn(PRODUCT_CODES)
  product?: ProductCode;
}
