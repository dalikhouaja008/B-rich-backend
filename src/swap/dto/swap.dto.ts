import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG } from 'src/orca/config';


export class SwapDto {
    @IsNotEmpty()
    @ApiProperty({ enum: CONFIG.ALLOWED_NETWORKS })
    network: string;
  
    @IsNotEmpty()
    @ApiProperty({ example: 'SOL' })
    tokenFrom: string;
  
    @IsNotEmpty()
    @ApiProperty({ example: 'USDC' })
    tokenTo: string;
  
    @IsNotEmpty()
    @ApiProperty({ 
      description: 'Amount to swap',
      minimum: 0.0,
      exclusiveMinimum: true 
    })
    tokenFromAmount: number;
  
    @IsNotEmpty()
    @ApiProperty({ 
      description: 'Base58 encoded public key'
    })
    publicKey: string;
  
    @ApiProperty({
      description: 'Slippage tolerance (0-1)',
      minimum: 0.0,
      maximum: 1.0,
      default: 0.01,
      required: false
    })
    slippage?: number;
  }
