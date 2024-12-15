import { IsEmail, IsNumber, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  numTel: string;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[0-9])/, { message: 'Password must contain at least one number' })
  password: string;

  @IsOptional()
  @IsNumber()
  role?: number;
}
