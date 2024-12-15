import { PartialType } from '@nestjs/mapped-types';
import { createWalletDto } from './create-wallet.dto';

export class UpdateSolanaDto extends PartialType(createWalletDto) {}
