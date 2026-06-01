import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { IntegrationApiKey } from '../entities/integration-api-key.entity';

const HEADER_NAME = 'x-api-key';

@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(IntegrationApiKey)
    private readonly keysRepo: Repository<IntegrationApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers[HEADER_NAME];
    const key = Array.isArray(provided) ? provided[0] : provided;

    if (!key) {
      throw new UnauthorizedException(`Missing ${HEADER_NAME} header`);
    }

    const match = await this.keysRepo.findOne({
      where: { keyValue: key, isActive: true },
    });

    if (!match) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    return true;
  }
}
