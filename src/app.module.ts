import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from './roles/roles.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import config from './config/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictionModule } from './prediction/prediction.module';
import { SolanaModule } from './solana/solana.module';
import { NewsModule } from './news/news.module';
import { AccountsModule } from './accounts/accounts.module';
import { PoolModule } from './pool/pool.module';
import { FarmModule } from './farm/farm.module';
import { TokenModule } from './token/token.module';
import { SwapModule } from './swap/swap.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        secret: config.get('jwt.secret'),
      }),
      global: true,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        uri: config.get('database.connectionString'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    RolesModule,
    ExchangeRateModule,
    ScheduleModule.forRoot(),
    PredictionModule,
    SolanaModule,
    NewsModule,
    AccountsModule,
    PoolModule,
    FarmModule,
    TokenModule,
    SwapModule,
    PortfolioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
