import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MinLength,
} from 'class-validator';

import { INFO_REQUEST_ITEM_IDS } from '../policy';

export class RequestInfoDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(INFO_REQUEST_ITEM_IDS, { each: true })
  items!: string[];

  @IsString()
  @MinLength(1)
  message!: string;
}
