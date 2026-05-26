import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshTokenDto } from './dto/admin-refresh-token.dto';
import { AdminResendOtpDto } from './dto/admin-resend-otp.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Admin } from './entities/admin.entity';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@ApiTags('admin-auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a new admin — requires X-Admin-Create-Secret header (Postman/curl only)',
  })
  createAdmin(
    @Headers('x-admin-create-secret') secret: string,
    @Body() dto: CreateAdminDto,
  ) {
    const expected = this.config.get<string>('jwt.adminCreateSecret');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid or missing create secret.');
    }
    return this.adminAuthService.createAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login — validates credentials and sends OTP' })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and receive session tokens' })
  verifyOtp(@Body() dto: AdminVerifyOtpDto) {
    return this.adminAuthService.verifyOtp(dto.email, dto.otp);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP to admin email' })
  resendOtp(@Body() dto: AdminResendOtpDto) {
    return this.adminAuthService.resendOtp(dto.email);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange session token for a new access token' })
  refreshToken(@Body() dto: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshAccessToken(dto.sessionToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout — client must clear cookies' })
  logout() {
    return { success: true };
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Get current authenticated admin profile' })
  getMe(@CurrentAdmin() admin: Admin) {
    return this.adminAuthService.getMe(admin.id);
  }
}
