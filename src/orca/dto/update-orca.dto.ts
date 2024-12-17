import { PartialType } from '@nestjs/mapped-types';
import { CreateOrcaDto } from './create-orca.dto';

export class UpdateOrcaDto extends PartialType(CreateOrcaDto) {}
