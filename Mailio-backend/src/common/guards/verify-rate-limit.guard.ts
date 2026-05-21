import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RedisRateLimiter } from '../../limiter/redis-rate-limiter.service';
import type { User } from '../../users/entities/user.entity';

const MAX_REQUESTS = 50;
const WINDOW_MS = 60_000;

@Injectable()
export class VerifyRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(VerifyRateLimitGuard.name);

  constructor(private readonly limiter: RedisRateLimiter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const res = context.switchToHttp().getResponse<Response>();
    const userId = req.user?.id;

    if (!userId) return true;

    const key = `rate-limit:user:${userId}:verification`;

    let result: { granted: boolean; retryAfterMs: number };
    try {
      result = await this.limiter.acquire(key, {
        max: MAX_REQUESTS,
        windowMs: WINDOW_MS,
      });
    } catch (err) {

      this.logger.error(
        `Rate limiter failed for ${key}: ${(err as Error).message}`,
      );
      return true;
    }

    if (!result.granted) {
      const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again after 1 minute.',
          retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
