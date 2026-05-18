import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.fullName,
    });
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user, false),
      user: this.toUserDto(user),
    };
  }

  async login(user: User, remember = false) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user, remember),
      user: this.toUserDto(user),
    };
  }

  async refreshAccessToken(token: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(
        token,
        {
          secret: this.config.get<string>('jwt.secret'),
        },
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
    return { id: user.id, name: user.name, email: user.email, plan: user.plan };
  }
}
