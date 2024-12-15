import { IsString, IsBoolean, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  number: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  nickname: string;

  @IsString()
  status: string;

  @IsString()
  @IsNotEmpty()
  rib: string;

  @IsBoolean()
  isDefault: boolean;

  @IsNumber()
  balance: number;

  @IsString()
  user: string;
}
