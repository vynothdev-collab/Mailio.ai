import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EmailOtpService } from '../auth/email-otp.service';
import { OtpPurpose } from '../auth/entities/email-otp.entity';
import { S3StorageService } from '../common/storage/s3-storage.service';
import { AuthProvider, User } from './entities/user.entity';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface OAuthProfile {
  email: string;
  name: string;
  providerId: string;
  avatarUrl: string | null;
}

export type GoogleProfile = OAuthProfile;
export type LinkedinProfile = OAuthProfile;

export interface UserStats {
  totalEmails: number;
  validCount: number;
  invalidCount: number;
  catchallCount: number;
  unknownCount: number;
  listsCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly emailOtpService: EmailOtpService,
    private readonly storage: S3StorageService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.usersRepo.delete({ id });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    emailVerified?: boolean;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const { emailVerified, ...rest } = data;
    const user = this.usersRepo.create({
      ...rest,
      provider: AuthProvider.LOCAL,
      ...(emailVerified
        ? { emailVerified: true, emailVerifiedAt: new Date() }
        : {}),
    });
    return this.usersRepo.save(user);
  }

  async findOrCreateFromGoogle(profile: GoogleProfile): Promise<User> {
    return this.findOrCreateFromOAuth(AuthProvider.GOOGLE, profile);
  }

  async findOrCreateFromLinkedin(profile: LinkedinProfile): Promise<User> {
    return this.findOrCreateFromOAuth(AuthProvider.LINKEDIN, profile);
  }

  private async findOrCreateFromOAuth(
    provider: AuthProvider,
    profile: OAuthProfile,
  ): Promise<User> {
    const byProvider = await this.usersRepo.findOne({
      where: { provider, providerId: profile.providerId },
    });
    if (byProvider) {
      return this.touchProfile(byProvider, profile);
    }

    const byEmail = await this.findByEmail(profile.email);
    if (byEmail) {
      byEmail.provider = provider;
      byEmail.providerId = profile.providerId;
      byEmail.avatarUrl = profile.avatarUrl ?? byEmail.avatarUrl;
      byEmail.name = byEmail.name || profile.name;
      return this.usersRepo.save(byEmail);
    }

    const created = this.usersRepo.create({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider,
      providerId: profile.providerId,
      passwordHash: null,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    return this.usersRepo.save(created);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepo.update(
      { id: userId },
      { emailVerified: true, emailVerifiedAt: new Date() },
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update({ id: userId }, { passwordHash });
  }

  async updateProfile(userId: string, name: string): Promise<User> {
    await this.usersRepo.update({ id: userId }, { name });
    return this.usersRepo.findOneOrFail({ where: { id: userId } });
  }

  async setProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    success: true;
    profileImageUrl: string | null;
    profileImageKey: string;
    profileImageViewUrl: string;
  }> {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPG, JPEG, PNG, or WEBP images are allowed.',
      );
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException(
        'Image must be 2 MB or smaller.',
      );
    }

    const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
    const ext = MIME_EXTENSION[file.mimetype] ?? 'bin';
    const key = `profiles/${user.id}/avatar-${Date.now()}.${ext}`;

    const uploaded = await this.storage.uploadFile({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const previousKey = user.profileImageKey;
    // Only persist a static URL when the bucket is publicly readable.
    // Private buckets get nothing here — backend hands out fresh signed URLs.
    user.profileImageUrl = this.storage.isPublicRead() ? uploaded.url : null;
    user.profileImageKey = uploaded.key;
    await this.usersRepo.save(user);

    // Best-effort cleanup. Don't fail the request if the old object isn't there.
    if (previousKey && previousKey !== uploaded.key) {
      void this.storage.deleteFile(previousKey);
    }

    const profileImageViewUrl = this.storage.isPublicRead()
      ? uploaded.url
      : await this.storage.getSignedViewUrl(uploaded.key);

    return {
      success: true,
      profileImageUrl: user.profileImageUrl,
      profileImageKey: uploaded.key,
      profileImageViewUrl,
    };
  }

  async removeProfileImage(
    userId: string,
  ): Promise<{ success: true; profileImageUrl: null; profileImageKey: null }> {
    const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
    const previousKey = user.profileImageKey;
    user.profileImageUrl = null;
    user.profileImageKey = null;
    await this.usersRepo.save(user);

    if (previousKey) {
      void this.storage.deleteFile(previousKey);
    }

    return { success: true, profileImageUrl: null, profileImageKey: null };
  }

  async sendPasswordChangeOtp(user: User): Promise<{ message: string }> {
    await this.emailOtpService.issueAndSend(user, OtpPurpose.PASSWORD_CHANGE);
    return { message: 'Verification code sent to your email.' };
  }

  async changePassword(
    user: User,
    dto: { currentPassword?: string; newPassword: string; otp: string },
  ): Promise<{ message: string }> {
    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required.');
      }
      const valid = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
    }

    await this.emailOtpService.verify(
      user.email,
      dto.otp,
      OtpPurpose.PASSWORD_CHANGE,
    );

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.updatePassword(user.id, hash);

    return { message: 'Password changed successfully.' };
  }

  private async touchProfile(user: User, profile: OAuthProfile): Promise<User> {
    const nameChanged = profile.name && user.name !== profile.name;
    const avatarChanged = profile.avatarUrl && user.avatarUrl !== profile.avatarUrl;
    if (!nameChanged && !avatarChanged) return user;
    if (nameChanged) user.name = profile.name;
    if (avatarChanged) user.avatarUrl = profile.avatarUrl;
    return this.usersRepo.save(user);
  }

  async getStats(userId: string): Promise<UserStats> {
    const result = await this.usersRepo.manager.query(
      `SELECT
         COUNT(e.id)::int                                              AS "totalEmails",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'VALID')::int    AS "validCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'INVALID')::int  AS "invalidCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'CATCHALL')::int    AS "catchallCount",
         COUNT(e.id) FILTER (WHERE e.verification_result = 'UNKNOWN')::int  AS "unknownCount",
         COUNT(DISTINCT el.id)::int                                   AS "listsCount"
       FROM users u
       LEFT JOIN emails e  ON e.user_id = u.id
       LEFT JOIN email_lists el ON el.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return result[0] as UserStats;
  }
}
