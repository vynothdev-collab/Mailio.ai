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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { OtpPurpose } from './entities/email-otp.entity';
import { ResendVerificationOtpDto } from './dto/resend-verification-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { IntegrationApiKeyGuard } from './guards/integration-api-key.guard';

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

  @Post('signup-via-api-key')
  @UseGuards(IntegrationApiKeyGuard)
  @ApiOperation({
    summary:
      'Register a new user via integration API key — skips OTP verification',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'User created and auto-verified',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid x-api-key header',
  })
  signupViaApiKey(@Body() dto: SignupDto) {
    return this.authService.signupViaApiKey(dto);
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
  getOtpStatus(
    @Query('email') email: string,
    @Query('purpose') purpose?: string,
  ) {
    const otpPurpose =
      purpose === 'PASSWORD_RESET'
        ? OtpPurpose.PASSWORD_RESET
        : OtpPurpose.SIGNUP_VERIFY;
    return this.authService.getOtpStatus(email, otpPurpose);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset OTP to the given email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Reset code sent (or silently ignored for unknown emails)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('resend-password-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset code sent' })
  resendPasswordResetOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendPasswordResetOtp(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'OTP invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
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
