import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const HEADER = 'x-cross-domain-key';

@Injectable()
export class CrossDomainApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers[HEADER];
    const key = Array.isArray(provided) ? provided[0] : provided;

    const expected = this.config.get<string>('CROSS_DOMAIN_API_KEY');

    if (!key || !expected || key !== expected) {
      throw new UnauthorizedException('Invalid or missing cross-domain API key.');
    }

    return true;
  }
}
