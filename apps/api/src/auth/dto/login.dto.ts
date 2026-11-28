import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

import type { AppScope } from '@aim-ready/contracts';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsIn(['borrower', 'staff', 'admin'])
  appScope!: AppScope;
}
