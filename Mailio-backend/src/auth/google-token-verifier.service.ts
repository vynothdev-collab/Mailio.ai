import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface VerifiedGoogleIdentity {
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(config: ConfigService) {
    const clientId = config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured',
      );
    }
    this.clientId = clientId;
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      this.logger.warn(
        `Google ID token verification failed: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Invalid Google credential');
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (payload.aud !== this.clientId) {
      throw new UnauthorizedException('Audience mismatch');
    }
    if (!payload.email || !payload.sub) {
      throw new UnauthorizedException('Google token missing required claims');
    }
    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      providerId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: true,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
    };
  }
}
