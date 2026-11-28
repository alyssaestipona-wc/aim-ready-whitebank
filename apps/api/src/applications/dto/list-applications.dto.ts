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

export type QueueFilter = 'mine' | 'unassigned';
const QUEUE_FILTERS: QueueFilter[] = ['mine', 'unassigned'];

export class ListApplicationsDto {
  @IsOptional()
  @IsIn(STAGES)
  stage?: ApplicationStage;

  @IsOptional()
  @IsIn(PRODUCT_CODES)
  product?: ProductCode;

  @IsOptional()
  @IsIn(QUEUE_FILTERS)
  queue?: QueueFilter;
}
