import {
  Body,
  Controller,
  Post,
  Put,
  Req,
  UseGuards,
  Get,
  Param,
  NotFoundException,
  HttpException,
  HttpStatus, // Assurez-vous que Param est importé ici
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-tokens.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

// Endpoint GET /auth/user-wallet/:id
@Get('user-wallet/:id')
  async getUserWallet(@Param('id') id: string) {
    try {
      const wallets = await this.authService.findByUserId(id);
      return {
        success: true,
        userId: id,
        wallet: wallets,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Error fetching user wallets',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Endpoint GET /auth/users
  @Get('users')
  async findAllUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Endpoint GET /auth/users/:id
  @Get('users/:id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post('signup')
  async signUp(@Body() signupData: SignupDto) {
    return this.authService.signup(signupData);
  }

  @Post('login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Post('loginwithbiometric')
  async loginwithbiometric(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthenticationGuard)
  @Put('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req,
  ) {
    return this.authService.changePassword(
      req.userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('request')
  async requestReset(@Body() body: { email: string }) {
    return this.authService.requestReset(body.email);
  }

  @Post('verify')
  async verifyCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyCode(body.email, body.code);
  }

  @Post('reset')
  async resetPassword(
    @Body() body: { email: string; code: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }
}
