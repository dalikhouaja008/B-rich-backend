import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG } from 'src/orca/config';


export class SwapDto {

  
    @IsNotEmpty()
    @ApiProperty({ 
        description: 'Input token symbol (e.g., SOL, USDC)',
        example: 'SOL'
    })
    fromSymbol: string;

    @IsNotEmpty()
    @ApiProperty({ 
        description: 'Output token symbol (e.g., USDC, SOL)',
        example: 'USDC'
    })
    toSymbol: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @ApiProperty({ 
        description: 'Amount to swap',
        minimum: 0.0,
        exclusiveMinimum: true 
    })
    amount: number;

    @IsNotEmpty()
    @ApiProperty({ 
        description: 'User public key'
    })
    userPublicKey: string;

    @IsNumber()
    @Min(0)
    @Max(1)
    @ApiProperty({
        description: 'Slippage tolerance (0-1)',
        minimum: 0.0,
        maximum: 1.0,
        default: 0.01,
        required: false
    })
    slippage?: number = 0.01;
  }
