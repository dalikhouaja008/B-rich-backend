import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { ResetToken, ResetTokenSchema } from './schemas/reset-token.schema';
import { MailService } from 'src/services/mail.service';
import { RolesModule } from 'src/roles/roles.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), 
    PassportModule.register({ defaultStrategy: 'jwt' }), // Ajoutez cette ligne
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    RolesModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
      {
        name: ResetToken.name,
        schema: ResetTokenSchema,
      },
    ]),
    //MailerModule.forRoot({
      //transport: {
        //host: process.env.MAIL_HOST,
        //port: parseInt(process.env.MAIL_PORT, 10),
        //auth: {
          //user: process.env.MAIL_USER,
          //pass: process.env.MAIL_PASSWORD,
        //},
     // },
      //defaults: {
        //from: '"No Reply" <noreply@example.com>',
      //},
    //}),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService,JwtStrategy, JwtAuthGuard],
  exports: [AuthService,PassportModule,JwtModule, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
