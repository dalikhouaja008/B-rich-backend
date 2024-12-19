import { Injectable } from '@nestjs/common';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfolioInterface } from './interface/portfolio.interface';
import { Portfolio } from './entities/portfolio.entity';
import { getPortfolio } from 'src/orca/solana.utils';

@Injectable()
export class PortfolioService {
  async portfolio(i: PortfolioInterface): Promise<Portfolio> {
    return getPortfolio(i.connection, i.publicKey);
}
  create(createPortfolioDto: CreatePortfolioDto) {
    return 'This action adds a new portfolio';
  }

  findAll() {
    return `This action returns all portfolio`;
  }

  findOne(id: number) {
    return `This action returns a #${id} portfolio`;
  }

  update(id: number, updatePortfolioDto: UpdatePortfolioDto) {
    return `This action updates a #${id} portfolio`;
  }

  remove(id: number) {
    return `This action removes a #${id} portfolio`;
  }
}
