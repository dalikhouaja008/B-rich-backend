import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTNDWalletDto {
    @IsNotEmpty()
    @IsString()
    rib: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0, { message: 'Amount must be greater than 0' })
    amount: number;
}