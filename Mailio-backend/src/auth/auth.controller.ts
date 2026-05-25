import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedinLoginDto } from './dto/linkedin-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationOtpDto } from './dto/resend-verification-otp.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const AUTH_RESPONSE = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    refreshToken: {
      type: 'string',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', format: 'email', example: 'jane@example.com' },
        plan: { type: 'string', enum: ['PRO', 'ULTIMATE'], example: 'PRO' },
      },
    },
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user and send verification OTP' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'User created — verification email sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already registered',
  })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify signup email with OTP' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }

  @Get('otp-status')
  @ApiOperation({ summary: 'Get remaining resend cooldown for an email OTP' })
  @ApiResponse({ status: 200, description: 'Returns remainingSeconds and sendCount' })
  getOtpStatus(@Query('email') email: string) {
    return this.authService.getOtpStatus(email);
  }

  @Post('resend-verification-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend signup verification OTP' })
  @ApiBody({ type: ResendVerificationOtpDto })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  resendVerificationOtp(@Body() dto: ResendVerificationOtpDto) {
    return this.authService.resendVerificationOtp(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login and receive JWT tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful — returns tokens and profile',
    schema: AUTH_RESPONSE,
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  login(@Request() req: { user: User }, @Body() body: LoginDto) {
    return this.authService.login(req.user, body.remember ?? false);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or sign up with a Google ID token' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Google login successful — returns tokens and profile',
    schema: AUTH_RESPONSE,
  })
  @ApiResponse({ status: 401, description: 'Invalid Google credential' })
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken, dto.remember ?? false);
  }

  @Post('linkedin/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a LinkedIn authorization code for a session',
  })
  @ApiBody({ type: LinkedinLoginDto })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn login successful — returns tokens and profile',
    schema: AUTH_RESPONSE,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid LinkedIn authorization code',
  })
  linkedinCallback(@Body() dto: LinkedinLoginDto) {
    return this.authService.loginWithLinkedin(
      dto.code,
      dto.redirectUri,
      dto.remember ?? false,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (client should discard tokens)' })
  @ApiResponse({
    status: 200,
    description: 'Always succeeds',
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  logout() {
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiResponse({
    status: 200,
    description: 'New access token issued',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }
}
