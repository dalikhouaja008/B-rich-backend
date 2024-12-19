import { Injectable } from '@nestjs/common';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { TokenInterface } from './interface/token.interface';
import { getAllTokens } from 'src/orca/orca-utils';
import { TokenInfo } from '@solana/spl-token-registry';

@Injectable()
export class TokenService {
  
  async token(i: TokenInterface): Promise<TokenInfo[]> {
    return getAllTokens(i.network);
}
  create(createTokenDto: CreateTokenDto) {
    return 'This action adds a new token';
  }

  findAll() {
    return `This action returns all token`;
  }

  findOne(id: number) {
    return `This action returns a #${id} token`;
  }

  update(id: number, updateTokenDto: UpdateTokenDto) {
    return `This action updates a #${id} token`;
  }

  remove(id: number) {
    return `This action removes a #${id} token`;
  }
}
