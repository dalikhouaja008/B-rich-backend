import { IsString, IsOptional } from 'class-validator';

export class LinkAccountDto {
  @IsString()
  rib: string;

  @IsString()
  @IsOptional()
  nickname?: string;
}