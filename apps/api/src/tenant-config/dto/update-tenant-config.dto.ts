import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTenantConfigDto {
  @IsOptional()
  @IsBoolean()
  killSwitch?: boolean;

  @IsOptional()
  @IsBoolean()
  bureauDown?: boolean;
}
