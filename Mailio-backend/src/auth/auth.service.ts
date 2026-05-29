import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthProvider, User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { EmailOtpService } from './email-otp.service';
import { OtpPurpose } from './entities/email-otp.entity';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { LinkedinAuthService } from './linkedin-auth.service';

const RESET_RATE_LIMIT = 3;
const RESET_RATE_WINDOW_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly googleVerifier: GoogleTokenVerifierService,
    private readonly linkedinAuth: LinkedinAuthService,
    private readonly emailOtpService: EmailOtpService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before login.');
    }
    return user;
  }

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.fullName,
    });
    try {
      await this.emailOtpService.issueAndSend(user);
    } catch (err) {
      if (!user.emailVerified) {
        await this.usersService.deleteById(user.id);
      }
      throw err;
    }
    return {
      success: true,
      email: user.email,
      message: 'Signup successful. Please verify your email.',
    };
  }

  async signupViaApiKey(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.fullName,
      emailVerified: true,
    });
    return {
      success: true,
      email: user.email,
      message: 'Signup successful.',
    };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');
    if (user.emailVerified) {
      return { success: true, message: 'Email already verified.' };
    }
    await this.emailOtpService.verify(email, otp);
    await this.usersService.markEmailVerified(user.id);
    return { success: true, message: 'Email verified successfully.' };
  }

  async getOtpStatus(email: string, purpose = OtpPurpose.SIGNUP_VERIFY) {
    return this.emailOtpService.getStatus(email, purpose);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_RESPONSE = {
      message: 'If that email is registered, a reset code has been sent.',
    };

    const user = await this.usersService.findByEmail(email);
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return SAFE_RESPONSE;
    }

    const recentCount = await this.emailOtpService.countRecentRequests(
      email,
      OtpPurpose.PASSWORD_RESET,
      RESET_RATE_WINDOW_MINUTES,
    );
    if (recentCount >= RESET_RATE_LIMIT) {
      throw new HttpException(
        'Too many password reset requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.emailOtpService.issueAndSend(user, OtpPurpose.PASSWORD_RESET);

    return SAFE_RESPONSE;
  }

  async resendPasswordResetOtp(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return { message: 'Verification code sent.' };
    }
    await this.emailOtpService.resend(user, OtpPurpose.PASSWORD_RESET);
    return { message: 'Verification code sent.' };
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');

    await this.emailOtpService.verify(email, otp, OtpPurpose.PASSWORD_RESET);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  async resendVerificationOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');
    if (user.emailVerified) {
      return { success: true, message: 'Email is already verified.' };
    }
    await this.emailOtpService.resend(user);
    return { success: true, message: 'Verification code sent.' };
  }

  async login(user: User, remember = false) {
    return this.issueSession(user, remember);
  }

  async loginWithGoogle(idToken: string, remember = false) {
    const identity = await this.googleVerifier.verify(idToken);
    const user = await this.usersService.findOrCreateFromGoogle({
      providerId: identity.providerId,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
    });
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueSession(user, remember);
  }

  async loginWithLinkedin(code: string, redirectUri: string, remember = false) {
    const identity = await this.linkedinAuth.authenticate(code, redirectUri);
    const user = await this.usersService.findOrCreateFromLinkedin({
      providerId: identity.providerId,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
    });
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueSession(user, remember);
  }

  async refreshAccessToken(token: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(
        token,
        { secret: this.config.get<string>('jwt.secret') },
      );
      if (payload.type !== 'refresh')
        throw new UnauthorizedException('Invalid token type');
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) throw new UnauthorizedException();
      return { accessToken: this.signAccessToken(user) };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private issueSession(user: User, remember: boolean) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user, remember),
      user: this.toUserDto(user),
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, plan: user.plan, type: 'access' },
      { expiresIn: '15m' },
    );
  }

  private signRefreshToken(user: User, remember: boolean): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: remember ? '30d' : '1d' },
    );
  }

  private toUserDto(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
    };
  }
}
