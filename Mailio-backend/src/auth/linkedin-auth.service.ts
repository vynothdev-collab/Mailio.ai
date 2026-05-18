import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

interface LinkedinTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface LinkedinUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: string;
}

export interface VerifiedLinkedinIdentity {
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class LinkedinAuthService {
  private readonly logger = new Logger(LinkedinAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    config: ConfigService,
  ) {
    const clientId = config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = config.get<string>('LINKEDIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET are not configured',
      );
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async authenticate(
    code: string,
    redirectUri: string,
  ): Promise<VerifiedLinkedinIdentity> {
    const tokens = await this.exchangeCode(code, redirectUri);
    const profile = await this.fetchUserInfo(tokens.access_token);

    if (!profile.email || !profile.sub) {
      throw new UnauthorizedException(
        'LinkedIn profile is missing required claims',
      );
    }
    if (profile.email_verified === false) {
      throw new UnauthorizedException('LinkedIn email is not verified');
    }

    const fallbackName =
      [profile.given_name, profile.family_name].filter(Boolean).join(' ').trim() ||
      profile.email.split('@')[0];

    return {
      providerId: profile.sub,
      email: profile.email.toLowerCase(),
      name: profile.name?.trim() || fallbackName,
      avatarUrl: profile.picture ?? null,
    };
  }

  private async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<LinkedinTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<LinkedinTokenResponse>(
          LINKEDIN_TOKEN_URL,
          body.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            timeout: 10_000,
          },
        ),
      );
      if (!data?.access_token) {
        throw new UnauthorizedException('LinkedIn did not return an access token');
      }
      return data;
    } catch (err) {
      this.logger.warn(
        `LinkedIn token exchange failed: ${this.describeAxiosError(err)}`,
      );
      throw new UnauthorizedException('Invalid LinkedIn authorization code');
    }
  }

  private async fetchUserInfo(accessToken: string): Promise<LinkedinUserInfo> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<LinkedinUserInfo>(LINKEDIN_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10_000,
        }),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `LinkedIn userinfo fetch failed: ${this.describeAxiosError(err)}`,
      );
      throw new UnauthorizedException('Could not load LinkedIn profile');
    }
  }

  private describeAxiosError(err: unknown): string {
    const axiosErr = err as AxiosError<{ error_description?: string }>;
    return (
      axiosErr.response?.data?.error_description ??
      axiosErr.response?.statusText ??
      axiosErr.message ??
      'unknown'
    );
  }
}
