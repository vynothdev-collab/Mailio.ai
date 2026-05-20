import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { EmailOtpService } from './email-otp.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { LinkedinAuthService } from './linkedin-auth.service';

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
      throw new UnauthorizedException(
        'Please verify your email before login.',
      );
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
