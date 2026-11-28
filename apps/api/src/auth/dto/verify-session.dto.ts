import { IsString, MinLength } from 'class-validator';

export class VerifySessionDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
